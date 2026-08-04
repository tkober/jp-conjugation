"""PostgreSQL persistence: ORM models, engines and seeding.

Single global user, so ``user_profile`` holds exactly one row (id = 1).

Two roles are used (see :mod:`app.config`): the *owner* role runs DDL and the
startup seeding, the *app* role serves every request. The app role's access to
the owner-created tables comes from server-side ``ALTER DEFAULT PRIVILEGES``
(see ``dbeaver/grant_privileges.sql``), so no GRANT is issued from here.

Conjugated forms are **not** stored. The engine lives in this process, so the
expected answer is computed when it is needed — that keeps rule changes from
ever going stale against a materialised table of 65k forms.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator, Callable, Iterator, Sequence
from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    delete,
    func,
    select,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, insert
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from .config import app_database_url, owner_database_url
from .practice import item_base_rating, iter_practice_items, trigger_of, word_base_rating
from .vocabulary import load_vocabulary

log = logging.getLogger(__name__)

START_ELO = 1000.0
UPSERT_CHUNK = 500  # rows per INSERT ... ON CONFLICT (keeps the bind count sane)

# Answering budget: base + per kana of the expected answer. Covers thinking
# *and* typing, which is why it is tunable — a touchscreen needs more.
DEFAULT_TIME_BASE_MS = 3000
DEFAULT_TIME_PER_KANA_MS = 700
TIME_BASE_RANGE = (500, 15_000)
TIME_PER_KANA_RANGE = (200, 5_000)


class Base(DeclarativeBase):
    pass


class UserProfile(Base):
    __tablename__ = 'user_profile'
    __table_args__ = (CheckConstraint('id = 1', name='user_profile_single_row'),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    elo: Mapped[float] = mapped_column(Float, nullable=False)
    current_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    best_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    time_base_ms: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=str(DEFAULT_TIME_BASE_MS)
    )
    time_per_kana_ms: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=str(DEFAULT_TIME_PER_KANA_MS)
    )
    # Opt-*out* lists, like the app they replace: a form added in a later
    # version shows up in practice instead of staying invisible until noticed.
    disabled_forms: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    disabled_jlpt: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class Word(Base):
    __tablename__ = 'words'
    __table_args__ = (
        UniqueConstraint('word_type', 'kanji', 'hiragana', name='uq_words_identity'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    kanji: Mapped[str] = mapped_column(String, nullable=False)
    hiragana: Mapped[str] = mapped_column(String, nullable=False)
    english: Mapped[str] = mapped_column(String, nullable=False)
    jlpt: Mapped[str] = mapped_column(String, nullable=False)
    word_type: Mapped[str] = mapped_column(String, nullable=False)
    trigger: Mapped[str] = mapped_column(String, nullable=False)
    source: Mapped[str] = mapped_column(String, nullable=False, server_default='jisho')
    rating: Mapped[float] = mapped_column(Float, nullable=False)
    base_rating: Mapped[float] = mapped_column(Float, nullable=False)
    times_served: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    times_correct: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class PracticeItem(Base):
    """One conjugation rule as it is practised: form × word type × trigger."""

    __tablename__ = 'practice_items'
    __table_args__ = (
        UniqueConstraint('form_key', 'word_type', 'trigger', name='uq_practice_items_identity'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    form_key: Mapped[str] = mapped_column(String, nullable=False)
    word_type: Mapped[str] = mapped_column(String, nullable=False)
    trigger: Mapped[str] = mapped_column(String, nullable=False)
    rating: Mapped[float] = mapped_column(Float, nullable=False)
    base_rating: Mapped[float] = mapped_column(Float, nullable=False)
    times_served: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    times_correct: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_served_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class Attempt(Base):
    __tablename__ = 'attempts'
    __table_args__ = (Index('idx_attempts_created', 'created_at'),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    word_id: Mapped[int] = mapped_column(ForeignKey('words.id'), nullable=False)
    practice_item_id: Mapped[int] = mapped_column(
        ForeignKey('practice_items.id'), nullable=False
    )
    given: Mapped[str] = mapped_column(String, nullable=False)
    expected: Mapped[str] = mapped_column(String, nullable=False)
    correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    stem_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    ending_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    time_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    elo_before: Mapped[float] = mapped_column(Float, nullable=False)
    elo_after: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


# --- engines ---------------------------------------------------------------

_engine: AsyncEngine | None = None
_sessionmaker: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    """The app-role engine, created on first use.

    Lazy because the tests redirect the database after import time.
    """
    global _engine
    if _engine is None:
        _engine = create_async_engine(app_database_url(), pool_pre_ping=True)
    return _engine


def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    global _sessionmaker
    if _sessionmaker is None:
        _sessionmaker = async_sessionmaker(get_engine(), expire_on_commit=False)
    return _sessionmaker


async def reset_engines() -> None:
    """Dispose the app engine — for shutdown and between tests."""
    global _engine, _sessionmaker
    if _engine is not None:
        await _engine.dispose()
    _engine = None
    _sessionmaker = None


async def get_session() -> AsyncIterator[AsyncSession]:
    async with get_sessionmaker()() as session:
        yield session


# --- schema ----------------------------------------------------------------


async def migrate_schema(connection: Any) -> None:
    """Columns added after a table already existed.

    ``create_all`` only creates missing *tables*, never missing columns, so
    every new column needs a line here. Idempotent, runs on every boot.
    """
    statements: Sequence[str] = ()

    for statement in statements:
        await connection.execute(text(statement))


async def init_db() -> None:
    """Create the schema and refresh the seeded data, as the owner role."""
    engine = create_async_engine(owner_database_url())
    try:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
            await migrate_schema(connection)

        async with async_sessionmaker(engine, expire_on_commit=False)() as session:
            await ensure_user(session)
            await seed_words(session)
            await seed_practice_items(session)
            await session.commit()
    finally:
        await engine.dispose()


# --- seeding ---------------------------------------------------------------


async def ensure_user(session: AsyncSession) -> UserProfile:
    user = await session.get(UserProfile, 1)
    if user is None:
        user = UserProfile(id=1, elo=START_ELO, current_streak=0, best_streak=0)
        session.add(user)
        await session.flush()
    return user


def _chunks(rows: list[dict], size: int = UPSERT_CHUNK) -> Iterator[list[dict]]:
    for start in range(0, len(rows), size):
        yield rows[start:start + size]


async def seed_words(session: AsyncSession) -> None:
    """Upsert the vocabulary, then drop what no longer exists.

    A changed ``base_rating`` (say, the formula was rebalanced) shifts the
    live rating by the same amount, so the calibration learned from real
    answers survives.
    """
    entries = load_vocabulary()
    rows = [
        {
            'kanji': e.kanji,
            'hiragana': e.hiragana,
            'english': e.english,
            'jlpt': e.jlpt,
            'word_type': e.word_type.value,
            'trigger': trigger_of(e.word_type, e.hiragana),
            'source': e.source,
            'rating': word_base_rating(e),
            'base_rating': word_base_rating(e),
        }
        for e in entries
    ]

    for chunk in _chunks(rows):
        stmt = insert(Word).values(chunk)
        await session.execute(stmt.on_conflict_do_update(
            index_elements=[Word.word_type, Word.kanji, Word.hiragana],
            set_={
                'english': stmt.excluded.english,
                'jlpt': stmt.excluded.jlpt,
                'trigger': stmt.excluded.trigger,
                'source': stmt.excluded.source,
                'base_rating': stmt.excluded.base_rating,
                'rating': Word.rating + (stmt.excluded.base_rating - Word.base_rating),
            },
        ))

    desired = {(r['word_type'], r['kanji'], r['hiragana']) for r in rows}
    await _prune(session, Word, lambda w: (w.word_type, w.kanji, w.hiragana), desired,
                 Attempt.word_id)


async def seed_practice_items(session: AsyncSession) -> None:
    specs = iter_practice_items()
    rows = [
        {
            'form_key': spec.form_key,
            'word_type': spec.word_type.value,
            'trigger': spec.trigger,
            'rating': item_base_rating(spec),
            'base_rating': item_base_rating(spec),
        }
        for spec in specs
    ]

    for chunk in _chunks(rows):
        stmt = insert(PracticeItem).values(chunk)
        await session.execute(stmt.on_conflict_do_update(
            index_elements=[PracticeItem.form_key, PracticeItem.word_type, PracticeItem.trigger],
            set_={
                'base_rating': stmt.excluded.base_rating,
                'rating': PracticeItem.rating
                + (stmt.excluded.base_rating - PracticeItem.base_rating),
            },
        ))

    desired = {(r['form_key'], r['word_type'], r['trigger']) for r in rows}
    await _prune(session, PracticeItem,
                 lambda i: (i.form_key, i.word_type, i.trigger), desired,
                 Attempt.practice_item_id)


async def _prune(
    session: AsyncSession,
    model: type[Word] | type[PracticeItem],
    key: Callable[[Any], tuple[str, ...]],
    desired: set[tuple[str, ...]],
    attempt_column: Any,
) -> None:
    """Delete rows that fell out of the seed — unless they carry history.

    A word or item that has been answered stays: the attempt rows reference it,
    and throwing the history away to tidy up a dictionary would be a bad trade.
    """
    rows = list((await session.execute(select(model))).scalars())
    obsolete = [r.id for r in rows if key(r) not in desired]
    if not obsolete:
        return

    answered = set((await session.execute(
        select(attempt_column).where(attempt_column.in_(obsolete)).distinct()
    )).scalars())

    removable = [row_id for row_id in obsolete if row_id not in answered]
    if removable:
        await session.execute(delete(model).where(model.id.in_(removable)))
        log.info('pruned %s rows from %s', len(removable), model.__tablename__)
    if answered:
        log.info('kept %s answered %s rows that left the seed',
                 len(answered), model.__tablename__)


async def reset_all(session: AsyncSession) -> None:
    """Wipe the learning progress, keep the vocabulary and the time budget."""
    await session.execute(delete(Attempt))
    await session.execute(
        Word.__table__.update().values(
            rating=Word.base_rating, times_served=0, times_correct=0
        )
    )
    await session.execute(
        PracticeItem.__table__.update().values(
            rating=PracticeItem.base_rating,
            times_served=0,
            times_correct=0,
            last_served_at=None,
        )
    )
    user = await ensure_user(session)
    user.elo = START_ELO
    user.current_streak = 0
    user.best_streak = 0
    user.updated_at = func.now()
    await session.commit()
