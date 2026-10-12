"""Cram: grading without writing, scoped to a single form.

Calls the route functions directly against the `session` fixture, the same
way `test_selection.py` exercises `game.pick_next_exercise`/`submit_answer` —
`Session`/`Depends` only matter to FastAPI's wiring, the functions themselves
take a plain `AsyncSession`.
"""

import pytest
from fastapi import HTTPException
from sqlalchemy import delete, func, select

from app import game
from app.api import AnswerRequest
from app.conjugation import WordType
from app.cram import CramNextRequest
from app.cram import answer as cram_answer
from app.cram import form_info
from app.cram import next_exercise as cram_next
from app.db import Attempt, PracticeItem, UserProfile, Word
from app.practice import conjugate

FORM_KEY = 'Verbs__TeFormAffirmative'


async def _snapshot(session):
    user = await session.get(UserProfile, 1)
    items = {
        row.id: (row.rating, row.times_served, row.times_correct, row.last_served_at)
        for row in (await session.execute(select(PracticeItem))).scalars()
    }
    words = {
        row.id: (row.rating, row.times_served, row.times_correct)
        for row in (await session.execute(select(Word))).scalars()
    }
    attempts = await session.scalar(select(func.count()).select_from(Attempt))
    return (user.elo, user.current_streak, user.best_streak, user.updated_at), items, words, attempts


async def test_cram_never_writes_anything(session) -> None:
    """The isolation guarantee: a correct, a wrong and a given-up answer, and
    `user_profile`/`practice_items`/`words`/`attempts` must come back untouched.
    """
    before = await _snapshot(session)

    correct = await cram_next(CramNextRequest(form_key=FORM_KEY, recent_word_ids=[]), session)
    expected = conjugate(
        WordType(correct['word_type']), correct['kanji'], correct['hiragana'], correct['form_key'],
    )
    await cram_answer(AnswerRequest(
        practice_item_id=correct['practice_item_id'], word_id=correct['word_id'],
        answer=expected.hiragana, time_ms=800,
    ), session)

    wrong = await cram_next(CramNextRequest(form_key=FORM_KEY, recent_word_ids=[]), session)
    await cram_answer(AnswerRequest(
        practice_item_id=wrong['practice_item_id'], word_id=wrong['word_id'],
        answer='ぬぬぬ', time_ms=800,
    ), session)

    gave_up = await cram_next(CramNextRequest(form_key=FORM_KEY, recent_word_ids=[]), session)
    await cram_answer(AnswerRequest(
        practice_item_id=gave_up['practice_item_id'], word_id=gave_up['word_id'],
        answer='', time_ms=1200, gave_up=True,
    ), session)

    session.expire_all()  # force the asserts to hit the DB, not the identity map
    assert await _snapshot(session) == before


async def test_next_only_serves_the_requested_form(session) -> None:
    for _ in range(30):
        body = await cram_next(CramNextRequest(form_key=FORM_KEY, recent_word_ids=[]), session)
        assert body['form_key'] == FORM_KEY


async def test_next_works_for_a_form_disabled_in_settings(session) -> None:
    """`disabled_forms` is a practice-mode setting; cram deliberately ignores it."""
    user = await session.get(UserProfile, 1)
    user.disabled_forms = [FORM_KEY]
    await session.commit()

    body = await cram_next(CramNextRequest(form_key=FORM_KEY, recent_word_ids=[]), session)
    assert body['form_key'] == FORM_KEY


async def test_next_respects_disabled_jlpt(session) -> None:
    user = await session.get(UserProfile, 1)
    user.disabled_jlpt = ['n1', 'n2', 'n3', 'n4']
    await session.commit()

    for _ in range(20):
        body = await cram_next(CramNextRequest(form_key=FORM_KEY, recent_word_ids=[]), session)
        word = await session.get(Word, body['word_id'])
        assert word.jlpt == 'n5'


async def test_next_avoids_recent_word_ids_when_alternatives_exist(session, monkeypatch) -> None:
    """Pin item selection to ichidan (one big, trigger-less pool) so the
    exclusion is never the rare-trigger case where it has to fall back.
    """
    import app.cram as cram_module

    monkeypatch.setattr(
        cram_module.random, 'choice',
        lambda items: next(i for i in items if i.word_type == 'ichidan_verb'),
    )

    first = await cram_next(CramNextRequest(form_key=FORM_KEY, recent_word_ids=[]), session)

    for _ in range(20):
        body = await cram_next(
            CramNextRequest(form_key=FORM_KEY, recent_word_ids=[first['word_id']]), session,
        )
        assert body['word_id'] != first['word_id']


async def test_unknown_form_in_forms_lookup_is_404(session) -> None:
    with pytest.raises(HTTPException) as exc:
        await form_info('Nope', session)
    assert exc.value.status_code == 404


async def test_unknown_form_in_next_is_400(session) -> None:
    with pytest.raises(HTTPException) as exc:
        await cram_next(CramNextRequest(form_key='Nope', recent_word_ids=[]), session)
    assert exc.value.status_code == 400


async def test_empty_pool_is_409(session) -> None:
    await session.execute(delete(Word))
    await session.commit()

    with pytest.raises(HTTPException) as exc:
        await cram_next(CramNextRequest(form_key=FORM_KEY, recent_word_ids=[]), session)
    assert exc.value.status_code == 409


async def test_next_response_has_no_solution_or_profile_fields(session) -> None:
    body = await cram_next(CramNextRequest(form_key=FORM_KEY, recent_word_ids=[]), session)

    leaked = {
        'expected_kanji', 'expected_hiragana', 'target_time_ms',
        'elo', 'level', 'level_progress', 'current_streak', 'best_streak',
    }
    assert not leaked & body.keys()
    assert 'expected' not in str(body)


async def test_answer_response_has_no_scoring_fields(session) -> None:
    exercise = await cram_next(CramNextRequest(form_key=FORM_KEY, recent_word_ids=[]), session)

    body = await cram_answer(AnswerRequest(
        practice_item_id=exercise['practice_item_id'], word_id=exercise['word_id'],
        answer='x', time_ms=500,
    ), session)

    assert set(body.keys()) == {
        'correct', 'stem_correct', 'ending_correct', 'stem', 'ending', 'given',
        'expected_kanji', 'expected_hiragana', 'transformations',
    }


async def test_form_info_returns_title_group_and_word_count(session) -> None:
    body = await form_info(FORM_KEY, session)

    assert body['form_key'] == FORM_KEY
    assert body['category'] == 'Verbs'
    assert body['group'] == 'Te-form'
    assert body['title']
    assert body['settings_title']
    assert body['word_count'] > 0


async def test_form_info_word_count_drops_when_a_jlpt_level_is_disabled(session) -> None:
    full = (await form_info(FORM_KEY, session))['word_count']

    user = await session.get(UserProfile, 1)
    user.disabled_jlpt = ['n1']
    await session.commit()

    narrowed = (await form_info(FORM_KEY, session))['word_count']
    assert narrowed < full
