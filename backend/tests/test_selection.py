"""Selection and answering, end to end against the database."""

import random
import statistics

import pytest
from sqlalchemy import select

from app import game
from app.conjugation import WordType
from app.db import Attempt, PracticeItem, UserProfile, Word
from app.practice import conjugate


@pytest.fixture
def no_probing(monkeypatch):
    """Turn off the probe/review rolls so a test can check the plain targeting."""
    monkeypatch.setattr(random, 'random', lambda: 0.99)


async def test_exercise_matches_the_engine(session) -> None:
    exercise = await game.pick_next_exercise(session)

    expected = conjugate(
        WordType(exercise.word.word_type),
        exercise.word.kanji,
        exercise.word.hiragana,
        exercise.item.form_key,
    )
    assert exercise.expected_hiragana == expected.hiragana
    assert exercise.word.trigger == exercise.item.trigger
    assert exercise.word.word_type == exercise.item.word_type


async def test_word_brings_the_pair_to_the_users_level(session, no_probing) -> None:
    user = await session.get(UserProfile, 1)
    pairs = []
    for _ in range(40):
        exercise = await game.pick_next_exercise(session)
        pairs.append((exercise.item.rating + exercise.word.rating) / 2)

    # Not every item can be balanced — the extremes have no counterweight —
    # so this checks the middle, not each draw.
    assert abs(statistics.median(pairs) - user.elo) < 150


async def test_disabled_forms_are_not_served(session) -> None:
    user = await session.get(UserProfile, 1)
    keep = 'Verbs__TeFormAffirmative'
    all_forms = set((await session.execute(select(PracticeItem.form_key).distinct())).scalars())
    user.disabled_forms = sorted(all_forms - {keep})
    await session.commit()

    for _ in range(20):
        exercise = await game.pick_next_exercise(session)
        assert exercise.item.form_key == keep


async def test_disabled_levels_are_not_served(session) -> None:
    user = await session.get(UserProfile, 1)
    user.disabled_jlpt = ['n1', 'n2', 'n3', 'n4']
    await session.commit()

    for _ in range(20):
        exercise = await game.pick_next_exercise(session)
        assert exercise.word.jlpt == 'n5'


async def test_the_same_form_is_not_served_twice_in_a_row(session) -> None:
    seen = []
    for _ in range(12):
        exercise = await game.pick_next_exercise(session)
        await game.submit_answer(
            session, exercise.item.id, exercise.word.id, exercise.expected_hiragana, 1000
        )
        seen.append(exercise.item.form_key)

    assert all(a != b for a, b in zip(seen, seen[1:]))


async def test_a_correct_answer_raises_elo_and_streak(session) -> None:
    exercise = await game.pick_next_exercise(session)
    before = (await session.get(UserProfile, 1)).elo

    result = await game.submit_answer(
        session, exercise.item.id, exercise.word.id, exercise.expected_hiragana, 500
    )

    assert result['correct']
    assert result['elo']['after'] > before
    assert result['streak'] == 1
    assert result['transformations']


async def test_a_wrong_answer_lowers_elo_and_resets_the_streak(session) -> None:
    first = await game.pick_next_exercise(session)
    await game.submit_answer(session, first.item.id, first.word.id,
                             first.expected_hiragana, 500)

    second = await game.pick_next_exercise(session)
    before = (await session.get(UserProfile, 1)).elo
    result = await game.submit_answer(session, second.item.id, second.word.id, 'ぬぬぬ', 500)

    assert not result['correct']
    assert result['elo']['after'] < before
    assert result['streak'] == 0


async def test_a_slow_but_correct_answer_never_costs_elo(session) -> None:
    """The trap the reference project hit: right answer, easy item, minus Elo."""
    user = await session.get(UserProfile, 1)
    user.elo = 1600
    exercise = await game.pick_next_exercise(session)
    # Push the pair far below the user, where the expectation approaches 1.0.
    exercise.item.rating = 700
    exercise.word.rating = 700
    await session.commit()

    result = await game.submit_answer(
        session, exercise.item.id, exercise.word.id, exercise.expected_hiragana, 300_000
    )

    assert result['correct']
    assert not result['fast']
    assert result['elo']['delta'] >= 0


async def test_answering_records_an_attempt_and_moves_all_three_ratings(session) -> None:
    exercise = await game.pick_next_exercise(session)
    item_before = exercise.item.rating
    word_before = exercise.word.rating

    await game.submit_answer(session, exercise.item.id, exercise.word.id, 'まちがい', 2000)

    attempt = await session.scalar(select(Attempt))
    assert attempt is not None
    assert attempt.practice_item_id == exercise.item.id
    assert attempt.word_id == exercise.word.id
    assert not attempt.correct

    item = await session.get(PracticeItem, exercise.item.id)
    word = await session.get(Word, exercise.word.id)
    assert item.rating > item_before  # the item won, so it gets harder
    assert word.rating > word_before
    assert item.times_served == 1
    assert item.last_served_at is not None


async def test_partial_credit_beats_a_blank_miss(session) -> None:
    """Right rule on a misread stem should cost less than getting nothing."""
    exercise = await game.pick_next_exercise(session)
    near_miss = 'ん' + exercise.expected_hiragana[1:]  # right ending, broken stem

    result = await game.submit_answer(
        session, exercise.item.id, exercise.word.id, near_miss, 2000
    )
    near_delta = result['elo']['delta']

    other = await game.pick_next_exercise(session)
    other.item.rating = exercise.item.rating
    other.word.rating = exercise.word.rating
    await session.commit()
    result = await game.submit_answer(
        session, other.item.id, other.word.id, 'ぬぬぬぬ', 2000
    )

    assert near_delta > result['elo']['delta']
