"""Cram mode: drill one conjugation form, graded exactly like practice.

Cram is for "just let me hammer te-form negative for five minutes" — same
grading as `/api/answer`, but nothing is remembered: no Elo, no item/word
rating, no streak, no `Attempt` row. The isolation is structural rather than
"we remembered not to call `commit()`": every route in this module calls
`game.grade` and nothing else from `game` that writes, so there is no path
through `cram.py` that can reach `apply_rating` and therefore none that can
touch `user_profile`, `practice_items`, `words` or `attempts`.
`disabled_forms` is deliberately ignored — cram is the one place a form
disabled in Settings is still reachable, on purpose, since drilling it here
bypasses the adaptive queue entirely. `disabled_jlpt` still applies: that is
a vocabulary preference, not a selection-algorithm concern, and crammed words
should respect it the same as practice.
"""

from __future__ import annotations

import random
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select, tuple_
from sqlalchemy.ext.asyncio import AsyncSession

from . import game
from .api import AnswerRequest, exercise_payload
from .conjugation import FORM_GROUPS, Conjugation, WordType
from .db import PracticeItem, UserProfile, Word, get_session
from .practice import conjugate

router = APIRouter(prefix='/api/cram')

Session = Annotated[AsyncSession, Depends(get_session)]

# Body caps `recent_word_ids` at this many entries, the same purpose as
# `game.RECENT_WORDS` but client-supplied rather than read from `attempts`.
MAX_RECENT_WORDS = 200


class CramNextRequest(BaseModel):
    form_key: str
    recent_word_ids: list[int] = []


def _find_form(form_key: str) -> tuple[str, str, Conjugation] | None:
    """Category, group title and `Conjugation` for a form key, or `None`."""
    for category, group, forms in FORM_GROUPS:
        if form_key in forms:
            return category, group, forms[form_key]
    return None


async def _word_count(session: AsyncSession, form_key: str, user: UserProfile) -> int:
    pairs = (await session.execute(
        select(PracticeItem.word_type, PracticeItem.trigger)
        .where(PracticeItem.form_key == form_key)
        .distinct()
    )).all()
    if not pairs:
        return 0

    stmt = select(func.count(Word.id)).where(tuple_(Word.word_type, Word.trigger).in_(pairs))
    if user.disabled_jlpt:
        stmt = stmt.where(Word.jlpt.notin_(user.disabled_jlpt))
    return await session.scalar(stmt) or 0


async def _candidate_items(
    session: AsyncSession, user: UserProfile, form_key: str
) -> list[PracticeItem]:
    """Items of `form_key` whose word pool is non-empty under the JLPT filter.

    Unlike `game._candidate_items`, this ignores `disabled_forms` on purpose
    (see the module docstring) and is scoped to a single form.
    """
    items = list((await session.execute(
        select(PracticeItem).where(PracticeItem.form_key == form_key)
    )).scalars())
    if not items:
        return []

    pools = select(Word.word_type, Word.trigger).distinct()
    if user.disabled_jlpt:
        pools = pools.where(Word.jlpt.notin_(user.disabled_jlpt))
    available = set((await session.execute(pools)).all())

    return [item for item in items if (item.word_type, item.trigger) in available]


@router.get('/forms/{form_key}')
async def form_info(form_key: str, session: Session) -> dict[str, Any]:
    found = _find_form(form_key)
    if found is None:
        raise HTTPException(status_code=404, detail=f'unknown form {form_key!r}')
    category, group, form = found

    user = await game.get_user(session)
    return {
        'form_key': form_key,
        'title': form.title,
        'settings_title': form.settings_title,
        'category': category,
        'group': group,
        'word_count': await _word_count(session, form_key, user),
    }


@router.post('/next')
async def next_exercise(request: CramNextRequest, session: Session) -> dict[str, Any]:
    if _find_form(request.form_key) is None:
        raise HTTPException(status_code=400, detail=f'unknown form {request.form_key!r}')

    user = await game.get_user(session)
    items = await _candidate_items(session, user, request.form_key)
    if not items:
        raise HTTPException(
            status_code=409,
            detail=f'no words available for {request.form_key!r} — check the JLPT filter',
        )

    # Uniform over the items (word type × Godan trigger), not Elo-weighted —
    # cram is about the form, not about matching the user's level.
    item = random.choice(items)
    target = 2 * user.elo - item.rating
    recent = set(request.recent_word_ids[:MAX_RECENT_WORDS])

    try:
        word = await game._pick_word(session, user, item, target, recent)
    except LookupError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    conjugated = conjugate(WordType(word.word_type), word.kanji, word.hiragana, item.form_key)
    if conjugated is None:
        raise HTTPException(
            status_code=409, detail=f'{item.form_key} has no form for {word.kanji}'
        )

    exercise = game.Exercise(
        item=item, word=word,
        expected_kanji=conjugated.kanji, expected_hiragana=conjugated.hiragana,
    )
    return exercise_payload(exercise, user)


@router.post('/answer')
async def answer(request: AnswerRequest, session: Session) -> dict[str, Any]:
    item = await session.get(PracticeItem, request.practice_item_id)
    word = await session.get(Word, request.word_id)
    if item is None or word is None:
        raise HTTPException(
            status_code=404,
            detail=f'exercise {request.practice_item_id}/{request.word_id} not found',
        )

    user = await game.get_user(session)
    try:
        g = game.grade(
            user, item, word, request.answer, request.time_ms, gave_up=request.gave_up,
        )
    except LookupError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return game.grade_payload(g)
