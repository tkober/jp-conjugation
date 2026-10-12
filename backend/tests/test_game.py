"""Rating mathematics, without a database."""

from datetime import UTC, datetime, timedelta

import pytest

from app import game
from app.answer import Evaluation
from app.db import PracticeItem, UserProfile, Word
from app.game import (
    LEVEL_BASE_ELO,
    LEVEL_WIDTH,
    MAX_LEVEL,
    MIN_LEVEL,
    answer_score,
    effective_score,
    expected_score,
    item_weight,
    level_for_elo,
    level_progress,
    target_time_ms,
)


def evaluation(correct=False, stem=False, ending=False) -> Evaluation:
    return Evaluation(
        correct=correct, stem_correct=stem, ending_correct=ending,
        given='', expected='', stem='', ending='',
    )


def test_expected_score_is_symmetric() -> None:
    assert expected_score(1000, 1000) == pytest.approx(0.5)
    assert expected_score(1200, 1000) + expected_score(1000, 1200) == pytest.approx(1.0)


@pytest.mark.parametrize(('elo', 'level'), [
    (0, MIN_LEVEL),
    (LEVEL_BASE_ELO, 1),
    (LEVEL_BASE_ELO + LEVEL_WIDTH, 2),
    (LEVEL_BASE_ELO + 5 * LEVEL_WIDTH, 6),
    (99_999, MAX_LEVEL),
])
def test_level_mapping(elo: float, level: int) -> None:
    assert level_for_elo(elo) == level


def test_level_progress_is_bounded() -> None:
    assert level_progress(LEVEL_BASE_ELO) == pytest.approx(0.0)
    assert level_progress(LEVEL_BASE_ELO + LEVEL_WIDTH / 2) == pytest.approx(0.5)
    assert level_progress(99_999) == 1.0


def test_answer_score_ranks_the_rule_above_the_reading() -> None:
    right_rule = answer_score(evaluation(ending=True), fast=False)
    right_word = answer_score(evaluation(stem=True), fast=False)
    nothing = answer_score(evaluation(), fast=False)

    assert right_rule > right_word > nothing
    assert answer_score(evaluation(correct=True), fast=True) == 1.0
    assert answer_score(evaluation(correct=True), fast=False) == 0.85


def test_a_correct_answer_never_costs_elo() -> None:
    """A slow but right answer on an easy item used to end up negative."""
    exp = 0.97  # the item sits far below the user
    slow_but_right = answer_score(evaluation(correct=True), fast=False)

    assert slow_but_right < exp
    assert effective_score(slow_but_right, exp, correct=True) == exp


def test_a_wrong_answer_is_not_floored() -> None:
    assert effective_score(0.1, 0.97, correct=False) == 0.1


def make_item(**kwargs) -> PracticeItem:
    defaults = dict(
        form_key='Verbs__TeFormAffirmative', word_type='godan_verb', trigger='ぐ',
        rating=1000.0, base_rating=1000.0, times_served=0, times_correct=0,
        last_served_at=None,
    )
    return PracticeItem(**{**defaults, **kwargs})


def test_items_near_the_user_weigh_more() -> None:
    now = datetime.now(UTC)
    near = item_weight(make_item(rating=1000.0), 1000.0, now)
    far = item_weight(make_item(rating=1600.0), 1000.0, now)

    assert near > far


def test_a_stale_item_outweighs_a_fresh_one() -> None:
    now = datetime.now(UTC)
    fresh = make_item(rating=1000.0, last_served_at=now - timedelta(minutes=1),
                      times_served=10, times_correct=8)
    stale = make_item(rating=1000.0, last_served_at=now - timedelta(days=20),
                      times_served=10, times_correct=8)

    assert item_weight(stale, 1000.0, now) > item_weight(fresh, 1000.0, now)


def test_a_weak_item_outweighs_a_solid_one() -> None:
    now = datetime.now(UTC)
    seen = now - timedelta(hours=2)
    weak = make_item(rating=1000.0, last_served_at=seen, times_served=10, times_correct=2)
    solid = make_item(rating=1000.0, last_served_at=seen, times_served=10, times_correct=9)

    assert item_weight(weak, 1000.0, now) > item_weight(solid, 1000.0, now)


def test_an_unseen_item_is_fully_stale() -> None:
    now = datetime.now(UTC)
    unseen = make_item(rating=1000.0)
    just_seen = make_item(rating=1000.0, last_served_at=now)

    assert item_weight(unseen, 1000.0, now) > item_weight(just_seen, 1000.0, now)


def test_time_budget_grows_with_the_answer() -> None:
    assert target_time_ms(0) < target_time_ms(5) < target_time_ms(10)


def make_user(**kwargs) -> UserProfile:
    defaults = dict(id=1, elo=1000.0, current_streak=0, best_streak=0,
                     time_base_ms=4500, time_per_kana_ms=1000)
    return UserProfile(**{**defaults, **kwargs})


def make_word(**kwargs) -> Word:
    defaults = dict(
        id=1, kanji='食べる', hiragana='たべる', english='to eat', jlpt='n5',
        word_type='ichidan_verb', trigger='-', source='jisho',
        rating=750.0, base_rating=750.0, times_served=0, times_correct=0,
    )
    return Word(**{**defaults, **kwargs})


def test_grade_is_pure_and_judges_a_correct_fast_answer() -> None:
    """`grade` never touches a session — these objects are never persisted."""
    user = make_user()
    item = make_item(form_key='Verbs__TeFormAffirmative', word_type='ichidan_verb', trigger='-')
    word = make_word()

    g = game.grade(user, item, word, 'たべて', 800)

    assert g.evaluation.correct
    assert g.conjugated.hiragana == 'たべて'
    assert g.fast
    assert g.time_ms == 800
    assert g.target_ms == game.user_target_time_ms(user, len('たべて'))
    assert set(game.grade_payload(g).keys()) == {
        'correct', 'stem_correct', 'ending_correct', 'stem', 'ending', 'given',
        'expected_kanji', 'expected_hiragana', 'transformations',
    }


def test_grade_clamps_time_and_scores_a_giveup_as_a_miss() -> None:
    user = make_user()
    item = make_item(form_key='Verbs__TeFormAffirmative', word_type='ichidan_verb', trigger='-')
    word = make_word()

    g = game.grade(user, item, word, 'たべて', 999_999_999, gave_up=True)

    assert g.time_ms == 300_000  # the 0..300000 clamp from `submit_answer`
    assert not g.evaluation.correct
    assert not g.evaluation.stem_correct
    assert not g.evaluation.ending_correct
    assert not g.fast


def test_grade_raises_lookuperror_when_the_form_has_no_conjugation(monkeypatch) -> None:
    monkeypatch.setattr(game, 'conjugate', lambda *a, **k: None)
    user = make_user()
    item = make_item(form_key='Verbs__TeFormAffirmative', word_type='ichidan_verb', trigger='-')
    word = make_word()

    with pytest.raises(LookupError):
        game.grade(user, item, word, 'たべて', 800)
