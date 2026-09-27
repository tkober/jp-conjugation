"""What a target form is made of, as data instead of a title string.

A title like "Non-past, short, negative" is flat prose: the difference that
actually matters (affirmative vs. negative) sits at the end behind a shared
"-ative" suffix, "Non-past" reads like a second negation, "short" is jargon for
casual, and the slot positions shift between plain forms (three parts) and
derived forms (two parts) — the order does not even match how the word is
built. Japanese builds politeness, then negation, then tense
(食べ・ませ・ん・でした), and none of that comes through in prose.

Splitting a form into **dimensions** fixes all four problems at once: each
dimension renders as its own scannable chip, can carry an emoji so the practice
screen reads at a glance, and the four chips can be reordered per user instead
of being frozen into a sentence.

The eight plain forms (non-past/past × casual/polite × affirmative/negative)
set ``tense``, ``politeness`` and ``polarity`` — three independent choices. The
twelve derived forms (te-form, potential, passive, causative,
causative-passive, imperative) set ``category`` instead of ``tense`` and
``politeness``: those two never vary within a category (there is no "polite
te-form" as a separate rule), so showing them would just repeat the same chip
on every exercise for that category.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from .core import Conjugation


class Dimension(StrEnum):
    CATEGORY = 'category'
    TENSE = 'tense'
    POLITENESS = 'politeness'
    POLARITY = 'polarity'


class Category(StrEnum):
    TE_FORM = 'te_form'
    POTENTIAL = 'potential'
    PASSIVE = 'passive'
    CAUSATIVE = 'causative'
    CAUSATIVE_PASSIVE = 'causative_passive'
    IMPERATIVE = 'imperative'


class Tense(StrEnum):
    NON_PAST = 'non_past'
    PAST = 'past'


class Politeness(StrEnum):
    CASUAL = 'casual'
    POLITE = 'polite'


class Polarity(StrEnum):
    AFFIRMATIVE = 'affirmative'
    NEGATIVE = 'negative'


@dataclass(frozen=True)
class ValueInfo:
    label: str
    emoji: str
    marked: bool


#: Emoji sequences with a variation selector (▶️, 🕹️) must keep the U+FE0F in
#: the literal — dropping it renders the text-style glyph on some platforms.
VALUES: dict[Dimension, dict[str, ValueInfo]] = {
    Dimension.CATEGORY: {
        Category.TE_FORM: ValueInfo('Te-form', '🔗', False),
        Category.POTENTIAL: ValueInfo('Potential', '💪', False),
        Category.PASSIVE: ValueInfo('Passive', '📥', False),
        Category.CAUSATIVE: ValueInfo('Causative', '🕹️', False),
        Category.CAUSATIVE_PASSIVE: ValueInfo('Causative-passive', '🕹️📥', False),
        Category.IMPERATIVE: ValueInfo('Imperative', '📢', False),
    },
    Dimension.TENSE: {
        Tense.NON_PAST: ValueInfo('Present', '▶️', False),
        Tense.PAST: ValueInfo('Past', '⏪', True),
    },
    Dimension.POLITENESS: {
        Politeness.CASUAL: ValueInfo('Casual', '👕', False),
        Politeness.POLITE: ValueInfo('Polite', '🎩', True),
    },
    Dimension.POLARITY: {
        Polarity.AFFIRMATIVE: ValueInfo('Positive', '✅', False),
        Polarity.NEGATIVE: ValueInfo('Negative', '🚫', True),
    },
}

DIMENSION_LABELS: dict[Dimension, str] = {
    Dimension.CATEGORY: 'Form',
    Dimension.TENSE: 'Tense',
    Dimension.POLITENESS: 'Politeness',
    Dimension.POLARITY: 'Polarity',
}

#: Japanese build order: politeness, then negation, then tense — the order the
#: word is actually assembled in (食べ・ませ・ん・でした).
DEFAULT_INSTRUCTION_ORDER: tuple[str, ...] = (
    Dimension.CATEGORY, Dimension.POLITENESS, Dimension.POLARITY, Dimension.TENSE,
)
#: The order the old flat titles read in — offered as an alternative, not a
#: fallback: some users learned the forms this way.
TENSE_FIRST_ORDER: tuple[str, ...] = (
    Dimension.CATEGORY, Dimension.TENSE, Dimension.POLITENESS, Dimension.POLARITY,
)

INSTRUCTION_STYLES: tuple[str, ...] = ('text', 'emoji', 'both')
DEFAULT_INSTRUCTION_STYLE = 'text'


def instruction_parts(form: Conjugation, order: tuple[str, ...] | list[str]) -> list[dict]:
    """The chips for one form, in the given dimension order.

    A dimension the form does not set (e.g. ``tense`` on a derived form) is
    skipped rather than rendered empty — the whole point is that it never
    varies for that category, so a chip for it would say nothing.
    """
    parts = []
    for dim in order:
        value = getattr(form, dim, None)
        if value is None:
            continue
        info = VALUES[Dimension(dim)][value]
        parts.append({
            'dimension': str(dim),
            'value': str(value),
            'label': info.label,
            'emoji': info.emoji,
            'marked': info.marked,
        })
    return parts


def is_valid_order(order: Any) -> bool:
    if not isinstance(order, (list, tuple)):
        return False
    return len(order) == 4 and set(order) == {d.value for d in Dimension}


def dimension_catalog() -> list[dict]:
    """Every dimension with its possible values, for the settings legend."""
    return [
        {
            'dimension': dim.value,
            'label': DIMENSION_LABELS[dim],
            'values': [
                {'value': str(value), 'label': info.label, 'emoji': info.emoji}
                for value, info in VALUES[dim].items()
            ],
        }
        for dim in DEFAULT_INSTRUCTION_ORDER
    ]
