"""What counts as one practice item, and how hard it starts out.

A practice item is **form × word type × trigger** — not just form × word type.
The trigger is what the rule actually keys on: for godan verbs the final kana,
because 読む → 読んで and 泳ぐ → 泳いで are two rules wearing one name. Every
other word type conjugates uniformly and gets a single trigger.

That turns 96 coarse items into 256 fine ones, which is what makes "te-form of
ぐ-verbs is shaky" a thing the app can know.

The starting difficulties below are rough on purpose: item and word ratings are
Elo and re-calibrate themselves from real answers. They only need to put items
in roughly the right neighbourhood.
"""

from __future__ import annotations

from dataclasses import dataclass

from .conjugation import (
    ADJECTIVE_FORMS,
    ADJECTIVE_TYPES,
    VERB_FORMS,
    VERB_TYPES,
    Conjugation,
    WordType,
)
from .vocabulary import VocabularyEntry, jlpt_rank

#　う、つ、る、む、ぶ、ぬ、く、ぐ、す — every kana a godan verb can end on
GODAN_ENDINGS = ('う', 'つ', 'る', 'む', 'ぶ', 'ぬ', 'く', 'ぐ', 'す')

#: Word types that conjugate uniformly use this instead of a real trigger.
NO_TRIGGER = '-'

ITEM_BASE_RATING = 750.0
ITEM_DIFFICULTY_STEP = 90.0
ITEM_WORD_TYPE_STEP = 60.0

WORD_BASE_RATING = 750.0
WORD_JLPT_STEP = 200.0
WORD_LENGTH_NUDGE_CAP = 80.0
WORD_TYPICAL_LENGTH = 4

# Keyed on the conjugation class name, so the same class scores the same for
# adjectives and verbs. Roughly: how many steps away from the dictionary form.
FORM_DIFFICULTY: dict[str, int] = {
    'NonPastShortAffirmative': 0,
    'NonPastPoliteAffirmative': 1,
    'NonPastShortNegative': 2,
    'NonPastPoliteNegative': 2,
    'PastPoliteAffirmative': 2,
    'PastShortAffirmative': 3,
    'PastShortNegative': 3,
    'PastPoliteNegative': 3,
    'TeFormAffirmative': 3,
    'ImperativeNegative': 3,
    'TeFormNegative': 4,
    'PotentialAffirmative': 4,
    'PotentialNegative': 5,
    'ImperativeAffirmative': 5,
    'PassiveAffirmative': 6,
    'PassiveNegative': 6,
    'CausativeAffirmative': 7,
    'CausativeNegative': 7,
    'CausativePassiveAffirmative': 8,
    'CausativePassiveNegative': 8,
}

# Godan needs the row shift, kuru is irregular throughout; the rest is mechanical.
WORD_TYPE_DIFFICULTY: dict[WordType, int] = {
    WordType.ICHIDAN_VERB: 0,
    WordType.SURU_VERB: 0,
    WordType.KURU_VERB: 1,
    WordType.GODAN_VERB: 1,
    WordType.I_ADJECTIVE: 0,
    WordType.NA_ADJECTIVE: 0,
}


@dataclass(frozen=True)
class PracticeItemSpec:
    """One practice item as the registry defines it, before it hits the DB."""

    form_key: str
    word_type: WordType
    trigger: str

    @property
    def title(self) -> str:
        return forms_for(self.word_type)[self.form_key].title


def forms_for(word_type: WordType) -> dict[str, Conjugation]:
    return ADJECTIVE_FORMS if word_type in ADJECTIVE_TYPES else VERB_FORMS


def triggers_for(word_type: WordType) -> tuple[str, ...]:
    return GODAN_ENDINGS if word_type is WordType.GODAN_VERB else (NO_TRIGGER,)


def trigger_of(word_type: WordType, hiragana: str) -> str:
    return hiragana[-1] if word_type is WordType.GODAN_VERB else NO_TRIGGER


def iter_practice_items() -> list[PracticeItemSpec]:
    items: list[PracticeItemSpec] = []

    for word_type in (*ADJECTIVE_TYPES, *VERB_TYPES):
        for form_key in forms_for(word_type):
            for trigger in triggers_for(word_type):
                items.append(PracticeItemSpec(form_key, word_type, trigger))

    return items


def item_base_rating(spec: PracticeItemSpec) -> float:
    form = forms_for(spec.word_type)[spec.form_key]
    difficulty = FORM_DIFFICULTY[type(form).__name__]

    return (
        ITEM_BASE_RATING
        + difficulty * ITEM_DIFFICULTY_STEP
        + WORD_TYPE_DIFFICULTY[spec.word_type] * ITEM_WORD_TYPE_STEP
    )


def word_base_rating(entry: VocabularyEntry) -> float:
    """JLPT level sets the neighbourhood, length nudges within it."""
    nudge = (len(entry.hiragana) - WORD_TYPICAL_LENGTH) * 20.0

    return (
        WORD_BASE_RATING
        + jlpt_rank(entry.jlpt) * WORD_JLPT_STEP
        + max(-WORD_LENGTH_NUDGE_CAP, min(WORD_LENGTH_NUDGE_CAP, nudge))
    )
