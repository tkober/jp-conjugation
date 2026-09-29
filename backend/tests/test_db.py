from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import create_async_engine

from app import config, db
from app.conjugation import DEFAULT_INSTRUCTION_ORDER, DEFAULT_INSTRUCTION_STYLE, WordType
from app.db import Attempt, PracticeItem, UserProfile, Word
from app.practice import GODAN_ENDINGS, NO_TRIGGER


async def test_seeding_creates_user_words_and_items(session) -> None:
    user = await session.get(UserProfile, 1)
    assert user is not None
    assert user.elo == db.START_ELO
    assert user.disabled_forms == []

    words = await session.scalar(select(func.count()).select_from(Word))
    items = await session.scalar(select(func.count()).select_from(PracticeItem))

    assert words > 3000
    assert items == 256


async def test_godan_words_carry_their_ending_as_trigger(session) -> None:
    rows = (await session.execute(
        select(Word.hiragana, Word.trigger).where(Word.word_type == WordType.GODAN_VERB.value)
    )).all()

    assert rows
    for hiragana, trigger in rows:
        assert trigger == hiragana[-1]
        assert trigger in GODAN_ENDINGS


async def test_non_godan_words_have_no_trigger(session) -> None:
    triggers = set((await session.execute(
        select(Word.trigger).where(Word.word_type != WordType.GODAN_VERB.value).distinct()
    )).scalars())

    assert triggers == {NO_TRIGGER}


async def test_every_item_has_at_least_one_word(session) -> None:
    """An item nothing can be drawn for would be an unreachable exercise."""
    items = list((await session.execute(select(PracticeItem))).scalars())
    word_keys = set((await session.execute(
        select(Word.word_type, Word.trigger).distinct()
    )).all())

    orphans = [
        f'{i.form_key} / {i.word_type} / {i.trigger}'
        for i in items
        if (i.word_type, i.trigger) not in word_keys
    ]

    assert not orphans, orphans


async def test_seeding_is_idempotent(session) -> None:
    before = await session.scalar(select(func.count()).select_from(Word))

    await db.seed_words(session)
    await db.seed_practice_items(session)
    await session.commit()

    assert await session.scalar(select(func.count()).select_from(Word)) == before


async def test_reseeding_keeps_the_learned_rating_offset(session) -> None:
    word = await session.scalar(select(Word).limit(1))
    learned_offset = 123.5
    word.rating = word.base_rating + learned_offset
    original_base = word.base_rating
    await session.commit()

    await db.seed_words(session)
    await session.commit()
    await session.refresh(word)

    assert word.base_rating == original_base
    assert word.rating == original_base + learned_offset


async def test_pruning_spares_answered_rows(session) -> None:
    word = await session.scalar(select(Word).limit(1))
    item = await session.scalar(select(PracticeItem).limit(1))
    session.add(Attempt(
        word_id=word.id,
        practice_item_id=item.id,
        given='あ',
        expected='い',
        correct=False,
        stem_correct=False,
        ending_correct=False,
        time_ms=1000,
        elo_before=1000.0,
        elo_after=990.0,
    ))
    await session.commit()

    # Nothing desired at all — everything would go, except what was answered.
    await db._prune(session, Word, lambda w: (w.word_type, w.kanji, w.hiragana),
                    set(), Attempt.word_id)
    await session.commit()

    survivors = list((await session.execute(select(Word.id))).scalars())
    assert survivors == [word.id]


async def test_reset_clears_progress_but_keeps_vocabulary(session) -> None:
    word = await session.scalar(select(Word).limit(1))
    item = await session.scalar(select(PracticeItem).limit(1))
    word.rating += 200
    word.times_served = 5
    item.rating -= 150
    session.add(Attempt(
        word_id=word.id, practice_item_id=item.id, given='あ', expected='い',
        correct=False, stem_correct=False, ending_correct=False, time_ms=1,
        elo_before=1000.0, elo_after=990.0,
    ))
    user = await session.get(UserProfile, 1)
    user.elo = 1400
    user.time_base_ms = 4321
    await session.commit()

    await db.reset_all(session)

    await session.refresh(word)
    await session.refresh(item)
    await session.refresh(user)
    assert word.rating == word.base_rating
    assert word.times_served == 0
    assert item.rating == item.base_rating
    assert user.elo == db.START_ELO
    assert await session.scalar(select(func.count()).select_from(Attempt)) == 0
    assert await session.scalar(select(func.count()).select_from(Word)) > 3000
    # The time budget describes the input device, not the progress.
    assert user.time_base_ms == 4321


async def test_migrate_data_renames_jisho_homograph_suffixed_rows(session) -> None:
    """Issue #5: a row seeded from the old, un-stripped jisho slug ("下手-2")

    must be renamed to the clean kanji in place — not replaced by a fresh
    row — so its id, rating and attempt history survive. Starting from the
    already-seeded clean "下手" row and renaming it back to "下手-2"
    reproduces the pre-fix production state: only the stale row exists, no
    clean counterpart yet.
    """
    stale = await session.scalar(
        select(Word).where(Word.word_type == WordType.NA_ADJECTIVE.value, Word.kanji == '下手')
    )
    assert stale is not None
    stale_id = stale.id
    stale.kanji = '下手-2'
    stale.times_served = 7
    stale.times_correct = 3
    await session.commit()

    item = await session.scalar(select(PracticeItem).limit(1))
    session.add(Attempt(
        word_id=stale_id,
        practice_item_id=item.id,
        given='へたじゃない',
        expected='へたじゃない',
        correct=True,
        stem_correct=True,
        ending_correct=True,
        time_ms=1500,
        elo_before=1000.0,
        elo_after=1010.0,
    ))
    await session.commit()

    await db.init_db()

    async with db.get_sessionmaker()() as fresh_session:
        renamed = await fresh_session.get(Word, stale_id)
        assert renamed.kanji == '下手'
        # times_served/times_correct aren't touched by the upsert, so the
        # rename (not a delete + insert) is what keeps them intact.
        assert renamed.times_served == 7
        assert renamed.times_correct == 3

        rows = list((await fresh_session.execute(
            select(Word).where(
                Word.word_type == WordType.NA_ADJECTIVE.value, Word.hiragana == 'へた'
            )
        )).scalars())
        assert [r.id for r in rows] == [stale_id]

    # Idempotent: nothing left to rename, running it again changes nothing.
    await db.init_db()
    async with db.get_sessionmaker()() as fresh_session:
        rows = list((await fresh_session.execute(
            select(Word).where(
                Word.word_type == WordType.NA_ADJECTIVE.value, Word.hiragana == 'へた'
            )
        )).scalars())
        assert [r.id for r in rows] == [stale_id]


async def test_migrate_schema_adds_the_instruction_columns_idempotently(session) -> None:
    """Simulates a deploy where the columns are new: drop them, boot again."""
    user = await session.get(UserProfile, 1)
    user.time_base_ms = 4321
    await session.commit()

    engine = create_async_engine(config.owner_database_url())
    try:
        async with engine.begin() as connection:
            await connection.execute(text(
                'ALTER TABLE user_profile DROP COLUMN instruction_style, '
                'DROP COLUMN instruction_order'
            ))
    finally:
        await engine.dispose()

    await db.init_db()

    async with db.get_sessionmaker()() as fresh_session:
        reloaded = await fresh_session.get(UserProfile, 1)
        assert reloaded.instruction_style == DEFAULT_INSTRUCTION_STYLE
        assert reloaded.instruction_order == list(DEFAULT_INSTRUCTION_ORDER)
        # The migration only adds columns — an existing, already-customised
        # value is untouched.
        assert reloaded.time_base_ms == 4321
