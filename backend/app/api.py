"""HTTP routes. Everything the SPA needs, and nothing it should not have.

The expected answer never leaves this process before it has been submitted:
``/api/exercise/next`` hands out the word and the target form, the solution
comes back with ``/api/answer``. The old app computed it in the browser.
"""

from __future__ import annotations

from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from . import game
from .conjugation import FORM_GROUPS, WordType
from .db import (
    DEFAULT_TIME_BASE_MS,
    DEFAULT_TIME_PER_KANA_MS,
    TIME_BASE_RANGE,
    TIME_PER_KANA_RANGE,
    Attempt,
    PracticeItem,
    UserProfile,
    Word,
    get_session,
    reset_all,
)
from .practice import forms_for
from .vocabulary import JLPT_LEVELS

router = APIRouter(prefix='/api')

Session = Annotated[AsyncSession, Depends(get_session)]

ELO_HISTORY_LIMIT = 120
RECENT_LIMIT = 20
WEAKEST_LIMIT = 8
MIN_ATTEMPTS_FOR_WEAKNESS = 3


class AnswerRequest(BaseModel):
    practice_item_id: int
    word_id: int
    answer: str = ''
    time_ms: int = 0


class SettingsRequest(BaseModel):
    disabled_forms: list[str] | None = None
    disabled_jlpt: list[str] | None = None
    time_base_ms: int | None = Field(default=None)
    time_per_kana_ms: int | None = Field(default=None)


class ResetRequest(BaseModel):
    confirm: str


def _profile(user: UserProfile) -> dict[str, Any]:
    return {
        'elo': round(user.elo, 1),
        'level': game.level_for_elo(user.elo),
        'level_progress': round(game.level_progress(user.elo), 3),
        'current_streak': user.current_streak,
        'best_streak': user.best_streak,
    }


@router.get('/health')
async def health() -> dict[str, str]:
    return {'status': 'ok'}


@router.get('/profile')
async def profile(session: Session) -> dict[str, Any]:
    return _profile(await game.get_user(session))


@router.get('/exercise/next')
async def next_exercise(session: Session) -> dict[str, Any]:
    try:
        exercise = await game.pick_next_exercise(session)
    except LookupError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    user = await game.get_user(session)
    kana_count = len(exercise.expected_hiragana)

    return {
        'practice_item_id': exercise.item.id,
        'word_id': exercise.word.id,
        'form_key': exercise.item.form_key,
        'form_title': forms_for(WordType(exercise.item.word_type))[
            exercise.item.form_key
        ].title,
        'word_type': exercise.item.word_type,
        'trigger': exercise.item.trigger,
        'kanji': exercise.word.kanji,
        'hiragana': exercise.word.hiragana,
        'english': exercise.word.english,
        'jlpt': exercise.word.jlpt,
        'target_time_ms': game.user_target_time_ms(user, kana_count),
        **_profile(user),
    }


@router.post('/answer')
async def answer(request: AnswerRequest, session: Session) -> dict[str, Any]:
    try:
        return await game.submit_answer(
            session,
            request.practice_item_id,
            request.word_id,
            request.answer,
            request.time_ms,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.get('/stats')
async def stats(session: Session) -> dict[str, Any]:
    user = await game.get_user(session)

    totals = (await session.execute(select(
        func.count(Attempt.id),
        func.count(Attempt.id).filter(Attempt.correct),
        func.count(Attempt.id).filter(~Attempt.correct, Attempt.ending_correct),
        func.count(Attempt.id).filter(~Attempt.correct, ~Attempt.ending_correct,
                                      Attempt.stem_correct),
        func.avg(Attempt.time_ms),
    ))).one()
    attempts, correct, rule_right, reading_right, avg_time = totals

    history = list(reversed(list((await session.execute(
        select(Attempt.elo_after).order_by(Attempt.id.desc()).limit(ELO_HISTORY_LIMIT)
    )).scalars())))

    item_rows = (await session.execute(
        select(
            PracticeItem.id,
            PracticeItem.form_key,
            PracticeItem.word_type,
            PracticeItem.trigger,
            PracticeItem.rating,
            PracticeItem.times_served,
            PracticeItem.times_correct,
            PracticeItem.last_served_at,
        ).order_by(PracticeItem.form_key, PracticeItem.word_type, PracticeItem.trigger)
    )).all()

    items = [
        {
            'id': row.id,
            'form_key': row.form_key,
            'title': forms_for(WordType(row.word_type))[row.form_key].title,
            'word_type': row.word_type,
            'trigger': row.trigger,
            'rating': round(row.rating, 1),
            'attempts': row.times_served,
            'correct': row.times_correct,
            'accuracy': (row.times_correct / row.times_served) if row.times_served else None,
            'last_served_at': row.last_served_at.isoformat() if row.last_served_at else None,
        }
        for row in item_rows
    ]

    weakest = sorted(
        (i for i in items if i['attempts'] >= MIN_ATTEMPTS_FOR_WEAKNESS),
        key=lambda i: i['accuracy'],
    )[:WEAKEST_LIMIT]

    recent = (await session.execute(
        select(
            Attempt.created_at, Attempt.given, Attempt.expected, Attempt.correct,
            Attempt.stem_correct, Attempt.ending_correct, Attempt.time_ms,
            Attempt.elo_before, Attempt.elo_after, Word.kanji, PracticeItem.form_key,
            PracticeItem.word_type,
        )
        .join(Word, Word.id == Attempt.word_id)
        .join(PracticeItem, PracticeItem.id == Attempt.practice_item_id)
        .order_by(Attempt.id.desc())
        .limit(RECENT_LIMIT)
    )).all()

    return {
        **_profile(user),
        'attempts': attempts,
        'correct': correct,
        'accuracy': (correct / attempts) if attempts else None,
        'avg_time_ms': round(float(avg_time)) if avg_time is not None else None,
        # Where the misses land: rule known but word misread, or the reverse.
        'missed_with_right_rule': rule_right,
        'missed_with_right_reading': reading_right,
        'elo_history': [round(e, 1) for e in history],
        'items': items,
        'weakest_items': weakest,
        'recent': [
            {
                'created_at': r.created_at.isoformat(),
                'kanji': r.kanji,
                'form_key': r.form_key,
                'title': forms_for(WordType(r.word_type))[r.form_key].title,
                'given': r.given,
                'expected': r.expected,
                'correct': r.correct,
                'stem_correct': r.stem_correct,
                'ending_correct': r.ending_correct,
                'time_ms': r.time_ms,
                'elo_delta': round(r.elo_after - r.elo_before, 1),
            }
            for r in recent
        ],
    }


@router.get('/settings')
async def get_settings(session: Session) -> dict[str, Any]:
    user = await game.get_user(session)

    groups = [
        {
            'category': category,
            'title': title,
            'forms': [
                {'form_key': key, 'title': form.title, 'settings_title': form.settings_title}
                for key, form in forms.items()
            ],
        }
        for category, title, forms in FORM_GROUPS
    ]

    return {
        'groups': groups,
        'jlpt_levels': list(JLPT_LEVELS),
        'disabled_forms': user.disabled_forms,
        'disabled_jlpt': user.disabled_jlpt,
        'time_base_ms': user.time_base_ms,
        'time_per_kana_ms': user.time_per_kana_ms,
        'defaults': {
            'time_base_ms': DEFAULT_TIME_BASE_MS,
            'time_per_kana_ms': DEFAULT_TIME_PER_KANA_MS,
        },
        'limits': {
            'time_base_ms': list(TIME_BASE_RANGE),
            'time_per_kana_ms': list(TIME_PER_KANA_RANGE),
        },
    }


@router.put('/settings')
async def put_settings(request: SettingsRequest, session: Session) -> dict[str, Any]:
    user = await game.get_user(session)
    known_forms = {key for _, _, forms in FORM_GROUPS for key in forms}

    if request.disabled_forms is not None:
        unknown = sorted(set(request.disabled_forms) - known_forms)
        if unknown:
            raise HTTPException(status_code=400, detail=f'unknown forms: {unknown}')
        if not known_forms - set(request.disabled_forms):
            raise HTTPException(status_code=400, detail='at least one form must stay enabled')
        user.disabled_forms = sorted(set(request.disabled_forms))

    if request.disabled_jlpt is not None:
        unknown = sorted(set(request.disabled_jlpt) - set(JLPT_LEVELS))
        if unknown:
            raise HTTPException(status_code=400, detail=f'unknown levels: {unknown}')
        if not set(JLPT_LEVELS) - set(request.disabled_jlpt):
            raise HTTPException(status_code=400, detail='at least one level must stay enabled')
        user.disabled_jlpt = sorted(set(request.disabled_jlpt))

    if request.time_base_ms is not None:
        low, high = TIME_BASE_RANGE
        user.time_base_ms = max(low, min(high, request.time_base_ms))

    if request.time_per_kana_ms is not None:
        low, high = TIME_PER_KANA_RANGE
        user.time_per_kana_ms = max(low, min(high, request.time_per_kana_ms))

    user.updated_at = func.now()
    await session.commit()

    return await get_settings(session)


@router.get('/words')
async def words(
    session: Session,
    word_type: str | None = None,
    jlpt: str | None = None,
    q: str | None = None,
    sort: Literal['rating', 'jlpt', 'kanji', 'attempts'] = 'rating',
    limit: Annotated[int, Query(ge=1, le=500)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> dict[str, Any]:
    stmt = select(Word)
    if word_type:
        stmt = stmt.where(Word.word_type == word_type)
    if jlpt:
        stmt = stmt.where(Word.jlpt == jlpt)
    if q:
        pattern = f'%{q}%'
        stmt = stmt.where(
            Word.kanji.ilike(pattern)
            | Word.hiragana.ilike(pattern)
            | Word.english.ilike(pattern)
        )

    total = await session.scalar(
        select(func.count()).select_from(stmt.subquery())
    )

    order = {
        'rating': Word.rating.desc(),
        'jlpt': case({level: n for n, level in enumerate(JLPT_LEVELS)}, value=Word.jlpt),
        'kanji': Word.kanji.asc(),
        'attempts': Word.times_served.desc(),
    }[sort]
    rows = list((await session.execute(
        stmt.order_by(order, Word.id).limit(limit).offset(offset)
    )).scalars())

    return {
        'total': total,
        'limit': limit,
        'offset': offset,
        'words': [
            {
                'id': w.id,
                'kanji': w.kanji,
                'hiragana': w.hiragana,
                'english': w.english,
                'jlpt': w.jlpt,
                'word_type': w.word_type,
                'trigger': w.trigger,
                'rating': round(w.rating, 1),
                'attempts': w.times_served,
                'correct': w.times_correct,
            }
            for w in rows
        ],
    }


@router.post('/reset')
async def reset(request: ResetRequest, session: Session) -> dict[str, str]:
    if request.confirm != 'RESET':
        raise HTTPException(status_code=400, detail='confirmation missing')

    await reset_all(session)
    return {'status': 'reset'}
