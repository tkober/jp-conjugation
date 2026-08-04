"""Adaptive selection and rating.

Three Elo ratings, not two: the **user**, the **practice item** (a rule) and the
**word**. An exercise is a pair, so its difficulty is the average of item and
word rating — and that is what makes the variety work. Once an item is chosen,
the word is picked to bring the pair back to the user's level:

    target_word_rating = 2 × user_elo − item_rating

A hard rule therefore pulls an easy word, an easy rule pulls a rarer one. The
challenge stays where it belongs while *which axis carries it* keeps changing.

There is deliberately **no interval scheduler**. Conjugation rules are
procedural — you do not forget ぐ → いで the way you forget a word, you get slow
and unsure — and with 256 items a due-queue would run dry in a quarter of an
hour. What spacing there is comes from a staleness term in the selection
weight: an item untouched for two weeks is at full weight, not overdue.
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .answer import Evaluation, evaluate, normalize
from .conjugation import WordType
from .db import (
    DEFAULT_TIME_BASE_MS,
    DEFAULT_TIME_PER_KANA_MS,
    Attempt,
    PracticeItem,
    UserProfile,
    Word,
)
from .practice import conjugate

# Climbing is slow, failing hurts. Items and words move slower than the user:
# each of them is seen far less often, so their ratings need less noise.
K_USER_GAIN = 20.0
K_USER_LOSS = 36.0
K_ITEM = 12.0
K_WORD = 8.0

MIN_LEVEL, MAX_LEVEL = 1, 20
LEVEL_BASE_ELO = 750.0
LEVEL_WIDTH = 75.0

RECENT_ITEMS = 8  # don't repeat the last N answered items
RECENT_WORDS = 40
WORD_POOL = 30  # words nearest the target to choose from

PROBE_CHANCE = 0.15  # a word above the comfort zone, to test the ceiling
REVIEW_CHANCE = 0.12  # a word well below it, to check it really stuck
PROBE_OFFSET = (120.0, 400.0)
REVIEW_OFFSET = (250.0, 600.0)

FIT_WIDTH = 300.0  # Elo distance at which an item's weight has dropped to 1/e
STALENESS_WEIGHT = 1.5
WEAKNESS_WEIGHT = 1.5
STALE_AFTER_MINUTES = 60 * 24 * 14  # two weeks counts as fully stale
UNSEEN_ACCURACY = 0.5  # what to assume before an item has been answered


def expected_score(ra: float, rb: float) -> float:
    return 1.0 / (1.0 + 10 ** ((rb - ra) / 400.0))


def level_for_elo(elo: float) -> int:
    return max(MIN_LEVEL, min(MAX_LEVEL, 1 + int((elo - LEVEL_BASE_ELO) // LEVEL_WIDTH)))


def level_progress(elo: float) -> float:
    """Progress towards the next level, 0..1."""
    level = level_for_elo(elo)
    if level >= MAX_LEVEL:
        return 1.0

    floor = LEVEL_BASE_ELO + (level - 1) * LEVEL_WIDTH
    return max(0.0, min(1.0, (elo - floor) / LEVEL_WIDTH))


def target_time_ms(
    kana_count: int,
    base_ms: int = DEFAULT_TIME_BASE_MS,
    per_kana_ms: int = DEFAULT_TIME_PER_KANA_MS,
) -> int:
    """Answering budget: base + per kana of the expected answer.

    Covers working out the form *and* typing it, which is why it is tunable —
    a touchscreen keyboard needs noticeably more than a real one.
    """
    return base_ms + per_kana_ms * kana_count


def user_target_time_ms(user: UserProfile, kana_count: int) -> int:
    return target_time_ms(kana_count, user.time_base_ms, user.time_per_kana_ms)


def answer_score(evaluation: Evaluation, fast: bool) -> float:
    """Partial credit, weighted towards knowing the *rule*.

    A right ending on a misread stem means the conjugation was understood, so
    it scores above the reverse case — this is a conjugation trainer, not a
    reading trainer.
    """
    if evaluation.correct:
        return 1.0 if fast else 0.85
    if evaluation.ending_correct:
        return 0.4
    if evaluation.stem_correct:
        return 0.25
    return 0.1


def effective_score(score: float, exp: float, correct: bool) -> float:
    """The score that actually goes into the Elo update.

    A correct answer must never cost Elo. On an easy review item the
    expectation climbs above the 0.85 "correct but slow" tier, which would turn
    a right answer into a loss. Lifting the score to the expectation makes
    speed decide how *much* is gained, not whether anything is lost. Wrong
    answers are untouched — that is what keeps the review items sharp.
    """
    return max(score, exp) if correct else score


def item_weight(item: PracticeItem, user_elo: float, now: datetime) -> float:
    """How badly this item wants to be next.

    Three factors: how well it fits the user's level, how long ago it was last
    seen, and how often it has been got wrong.
    """
    distance = abs(item.rating - user_elo)
    fit = math.exp(-((distance / FIT_WIDTH) ** 2))

    if item.last_served_at is None:
        staleness = 1.0
    else:
        minutes = (now - item.last_served_at).total_seconds() / 60.0
        staleness = min(1.0, math.log1p(max(0.0, minutes)) / math.log1p(STALE_AFTER_MINUTES))

    if item.times_served:
        accuracy = item.times_correct / item.times_served
    else:
        accuracy = UNSEEN_ACCURACY
    weakness = 1.0 - accuracy

    return fit * (1.0 + STALENESS_WEIGHT * staleness + WEAKNESS_WEIGHT * weakness)


@dataclass(frozen=True)
class Exercise:
    item: PracticeItem
    word: Word
    expected_kanji: str
    expected_hiragana: str


async def get_user(session: AsyncSession) -> UserProfile:
    return await session.get_one(UserProfile, 1)


async def _recent_ids(session: AsyncSession, column: Any, limit: int) -> set[int]:
    return set((await session.execute(
        select(column).order_by(Attempt.id.desc()).limit(limit)
    )).scalars())


async def _last_form_key(session: AsyncSession) -> str | None:
    return await session.scalar(
        select(PracticeItem.form_key)
        .join(Attempt, Attempt.practice_item_id == PracticeItem.id)
        .order_by(Attempt.id.desc())
        .limit(1)
    )


async def _candidate_items(session: AsyncSession, user: UserProfile) -> list[PracticeItem]:
    items = select(PracticeItem)
    if user.disabled_forms:
        items = items.where(PracticeItem.form_key.notin_(user.disabled_forms))

    pools = select(Word.word_type, Word.trigger).distinct()
    if user.disabled_jlpt:
        pools = pools.where(Word.jlpt.notin_(user.disabled_jlpt))
    available = set((await session.execute(pools)).all())

    return [
        item for item in (await session.execute(items)).scalars()
        if (item.word_type, item.trigger) in available
    ]


async def _pick_word(
    session: AsyncSession, user: UserProfile, item: PracticeItem, target: float
) -> Word:
    base = select(Word).where(
        Word.word_type == item.word_type,
        Word.trigger == item.trigger,
    )
    if user.disabled_jlpt:
        base = base.where(Word.jlpt.notin_(user.disabled_jlpt))

    recent = await _recent_ids(session, Attempt.word_id, RECENT_WORDS)
    for stmt in (base.where(Word.id.notin_(recent)) if recent else base, base):
        pool = list((await session.execute(
            stmt.order_by(func.abs(Word.rating - target)).limit(WORD_POOL)
        )).scalars())
        if pool:
            return random.choice(pool)

    # _candidate_items only offers items whose pool is non-empty.
    raise LookupError(f'no words for {item.word_type} / {item.trigger}')


async def pick_next_exercise(session: AsyncSession) -> Exercise:
    user = await get_user(session)
    items = await _candidate_items(session, user)
    if not items:
        raise LookupError('no practice items available — check the settings')

    recent = await _recent_ids(session, Attempt.practice_item_id, RECENT_ITEMS)
    last_form = await _last_form_key(session)

    # Neither filter may empty the list: with few items enabled they would.
    fresh = [i for i in items if i.id not in recent] or items
    varied = [i for i in fresh if i.form_key != last_form] or fresh

    now = datetime.now(UTC)
    weights = [item_weight(i, user.elo, now) for i in varied]
    if not any(weights):
        weights = None
    item = random.choices(varied, weights=weights, k=1)[0]

    # Hold the pair at the user's level, then occasionally probe or review.
    target = 2 * user.elo - item.rating
    roll = random.random()
    if roll < PROBE_CHANCE:
        target += random.uniform(*PROBE_OFFSET)
    elif roll < PROBE_CHANCE + REVIEW_CHANCE:
        target -= random.uniform(*REVIEW_OFFSET)

    word = await _pick_word(session, user, item, target)
    conjugated = conjugate(WordType(word.word_type), word.kanji, word.hiragana, item.form_key)
    if conjugated is None:
        raise LookupError(f'{item.form_key} has no form for {word.kanji}')

    return Exercise(
        item=item,
        word=word,
        expected_kanji=conjugated.kanji,
        expected_hiragana=conjugated.hiragana,
    )


async def submit_answer(
    session: AsyncSession,
    practice_item_id: int,
    word_id: int,
    given: str,
    time_ms: int,
) -> dict[str, Any]:
    item = await session.get(PracticeItem, practice_item_id)
    word = await session.get(Word, word_id)
    if item is None or word is None:
        raise KeyError(f'exercise {practice_item_id}/{word_id} not found')

    conjugated = conjugate(WordType(word.word_type), word.kanji, word.hiragana, item.form_key)
    if conjugated is None:
        raise LookupError(f'{item.form_key} has no form for {word.kanji}')

    ev = evaluate(word.hiragana, conjugated.hiragana, given)
    user = await get_user(session)

    time_ms = max(0, min(int(time_ms), 300_000))
    target = user_target_time_ms(user, len(normalize(conjugated.hiragana)))
    fast = ev.correct and time_ms <= target

    exercise_rating = (item.rating + word.rating) / 2.0
    elo_before = user.elo
    exp = expected_score(elo_before, exercise_rating)
    score = effective_score(answer_score(ev, fast), exp, ev.correct)

    k_user = K_USER_GAIN if score >= exp else K_USER_LOSS
    elo_after = elo_before + k_user * (score - exp)

    item.rating += K_ITEM * ((1.0 - score) - expected_score(item.rating, elo_before))
    item.times_served += 1
    item.times_correct += 1 if ev.correct else 0
    item.last_served_at = datetime.now(UTC)

    word.rating += K_WORD * ((1.0 - score) - expected_score(word.rating, elo_before))
    word.times_served += 1
    word.times_correct += 1 if ev.correct else 0

    streak = user.current_streak + 1 if ev.correct else 0
    user.elo = elo_after
    user.current_streak = streak
    user.best_streak = max(user.best_streak, streak)
    user.updated_at = func.now()

    session.add(Attempt(
        word_id=word.id,
        practice_item_id=item.id,
        given=ev.given,
        expected=ev.expected,
        correct=ev.correct,
        stem_correct=ev.stem_correct,
        ending_correct=ev.ending_correct,
        time_ms=time_ms,
        elo_before=elo_before,
        elo_after=elo_after,
    ))
    await session.commit()

    return {
        'correct': ev.correct,
        'stem_correct': ev.stem_correct,
        'ending_correct': ev.ending_correct,
        'fast': fast,
        'target_time_ms': target,
        'stem': ev.stem,
        'ending': ev.ending,
        'given': ev.given,
        'expected_kanji': conjugated.kanji,
        'expected_hiragana': conjugated.hiragana,
        'transformations': [
            {
                'unaltered': t.unaltered,
                'altered_part': t.altered_part,
                'alteration': t.alteration,
                'operation': t.operation,
            }
            for t in conjugated.transformations
        ],
        'elo': {
            'before': round(elo_before, 1),
            'after': round(elo_after, 1),
            'delta': round(elo_after - elo_before, 1),
        },
        'user_level': level_for_elo(elo_after),
        'level_progress': round(level_progress(elo_after), 3),
        'streak': streak,
        'best_streak': user.best_streak,
    }
