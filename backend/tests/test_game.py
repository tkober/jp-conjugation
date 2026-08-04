"""Rating mathematics, without a database."""

from datetime import UTC, datetime, timedelta

import pytest

from app.answer import Evaluation
from app.db import PracticeItem
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
