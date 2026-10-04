"""The rules section: every form explained, with examples from the engine.

The rule tables are **not** written by hand. Each row conjugates a sample word
with the very engine that grades the answers and reads the rule off the result
(``う → わない``), so the reference can never drift from what practice
expects. Only the prose — what a form means and how it is built — is written
here, one entry per settings group.

A row is one word type, or for godan verbs one final kana, because that is
what the rule keys on (the same split the practice items use). The engine's
special cases (行く, 呉れる, 良い) get a row of their own, but only for forms
where they actually break the regular rule — 行く conjugates like any く-verb
everywhere except the te-form and what builds on it.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .conjugation import ADJECTIVE_TYPES, FORM_GROUPS, VERB_TYPES, Word, WordType
from .practice import NO_TRIGGER


@dataclass(frozen=True)
class Sample:
    kanji: str
    hiragana: str
    english: str
    word_type: WordType
    exception: bool = False


#: One regular word per word type (per final kana for godan), plus the words
#: the engine special-cases. Same words as the conjugation test cases.
SAMPLES: tuple[Sample, ...] = (
    Sample('美味しい', 'おいしい', 'tasty', WordType.I_ADJECTIVE),
    Sample('良い', 'よい', 'good', WordType.I_ADJECTIVE, exception=True),
    Sample('好き', 'すき', 'liked', WordType.NA_ADJECTIVE),
    Sample('食べる', 'たべる', 'to eat', WordType.ICHIDAN_VERB),
    Sample('呉れる', 'くれる', 'to give (to me)', WordType.ICHIDAN_VERB, exception=True),
    Sample('会う', 'あう', 'to meet', WordType.GODAN_VERB),
    Sample('待つ', 'まつ', 'to wait', WordType.GODAN_VERB),
    Sample('取る', 'とる', 'to take', WordType.GODAN_VERB),
    Sample('読む', 'よむ', 'to read', WordType.GODAN_VERB),
    Sample('遊ぶ', 'あそぶ', 'to play', WordType.GODAN_VERB),
    Sample('死ぬ', 'しぬ', 'to die', WordType.GODAN_VERB),
    Sample('書く', 'かく', 'to write', WordType.GODAN_VERB),
    Sample('泳ぐ', 'およぐ', 'to swim', WordType.GODAN_VERB),
    Sample('話す', 'はなす', 'to speak', WordType.GODAN_VERB),
    Sample('行く', 'いく', 'to go', WordType.GODAN_VERB, exception=True),
    Sample('勉強する', 'べんきょうする', 'to study', WordType.SURU_VERB),
    Sample('来る', 'くる', 'to come', WordType.KURU_VERB),
)

#: How many trailing kana of the dictionary form a rule replaces. Everything
#: before that is the stem and stays put; kuru changes as a whole.
_ENDING_LENGTH: dict[WordType, int | None] = {
    WordType.I_ADJECTIVE: 1,
    WordType.NA_ADJECTIVE: 0,
    WordType.ICHIDAN_VERB: 1,
    WordType.GODAN_VERB: 1,
    WordType.SURU_VERB: 2,
    WordType.KURU_VERB: None,
}

#: The prose per settings group, keyed like ``FORM_GROUPS`` (category, title).
GROUP_TEXTS: dict[tuple[str, str], dict[str, str]] = {
    ('Adjectives', 'Present'): {
        'summary': 'Describes a state right now or in general: "it is tasty", '
                   '"it is not liked".',
        'build': 'I-adjectives conjugate themselves: the final い turns into くない '
                 'for the negative. Na-adjectives never change — the copula after '
                 'them does (だ / じゃない). Polite forms add です.',
    },
    ('Adjectives', 'Past'): {
        'summary': 'The same state, but in the past: "it was tasty", "it was not '
                   'liked".',
        'build': 'I-adjectives swap い for かった, the negative ない becomes なかった. '
                 'Na-adjectives put the copula into the past (だった / じゃなかった). '
                 'Polite forms add です to the casual past — except the na-adjective '
                 'positive, which uses でした.',
    },
    ('Verbs', 'Present'): {
        'summary': 'Habits, general truths and the future: "I eat", "I will not go". '
                   'Japanese has no separate future tense.',
        'build': 'The casual negative attaches ない to the あ-row of godan verbs '
                 '(う becomes わ). Polite forms attach ます / ません to the い-row stem. '
                 'Ichidan verbs just drop る; する and 来る are irregular.',
    },
    ('Verbs', 'Past'): {
        'summary': 'Something that happened or did not happen: "I ate", "I did not '
                   'go".',
        'build': 'The casual past is the te-form with て → た (で → だ), so it shares '
                 'every te-form sound change. The casual negative turns ない into '
                 'なかった. Polite forms use ました / ませんでした.',
    },
    ('Verbs', 'Te-form'): {
        'summary': 'The connecting form: links actions ("eat and then go"), makes '
                   'requests (〜てください) and builds many other forms (〜ている, '
                   '〜てもいい …).',
        'build': 'For godan verbs the final kana decides the sound change: う/つ/る → '
                 'って, む/ぶ/ぬ → んで, く → いて, ぐ → いで, す → して. 行く is the one '
                 'exception (行って). Ichidan verbs replace る with て. The negative is '
                 'the casual negative with ない → なくて.',
    },
    ('Verbs', 'Potential'): {
        'summary': 'Ability or possibility: "I can eat", "I cannot go".',
        'build': 'Godan verbs move the final kana to the え-row and add る. Ichidan '
                 'verbs add られる, 来る becomes 来られる, and suru verbs use 〜ができる. The result '
                 'is an ichidan verb, so its negative ends in ない.',
    },
    ('Verbs', 'Passive'): {
        'summary': 'Something is done to the subject: "I was scolded", "it is read '
                   'by many". Also used for respectful speech.',
        'build': 'Godan verbs move the final kana to the あ-row and add れる (う '
                 'becomes わ). Ichidan verbs add られる, する becomes される, 来る '
                 'becomes 来られる. For ichidan verbs passive and potential look the '
                 'same.',
    },
    ('Verbs', 'Causative'): {
        'summary': 'Making or letting someone do something: "I make him eat", "she '
                   'lets me go".',
        'build': 'Godan verbs move the final kana to the あ-row and add せる (う '
                 'becomes わ). Ichidan verbs add させる, する becomes させる, 来る '
                 'becomes 来させる.',
    },
    ('Verbs', 'Causative-passive'): {
        'summary': 'Being made to do something: "I was made to eat", "I am made to '
                   'wait".',
        'build': 'First the causative, then the passive of that: 食べさせる → '
                 '食べさせられる. The derivation below shows both steps.',
    },
    ('Verbs', 'Imperative'): {
        'summary': 'Blunt commands: "Eat!", "Don\'t go!". Rude in everyday speech — '
                   'you mostly meet it in signs, sports and manga.',
        'build': 'The positive moves godan verbs to the え-row and turns ichidan る '
                 'into ろ; する becomes しろ, 来る becomes 来い. The negative is the '
                 'dictionary form plus な for every verb.',
    },
}


def trigger_of_sample(sample: Sample) -> str:
    return sample.hiragana[-1] if sample.word_type is WordType.GODAN_VERB else NO_TRIGGER


def rule_of(word_type: WordType, dictionary: str, conjugated: str) -> tuple[str, str]:
    """The ending a rule replaces and what replaces it, read off one example.

    会う/あわない → (う, わない). When the conjugated form does not keep the stem
    (来る → こない, 良い → いい), the whole word is the rule. An empty ending
    means "append": 好き → 好きじゃない is ('', じゃない).
    """
    old, new = dictionary, conjugated
    length = _ENDING_LENGTH[word_type]
    if length is not None:
        stem = dictionary[:len(dictionary) - length]
        if conjugated.startswith(stem):
            old, new = dictionary[len(stem):], conjugated[len(stem):]

    # A rule that keeps the ending is a plain suffix: る → るな reads as + な,
    # and a form that changes nothing comes out as ('', '').
    if new.startswith(old):
        return '', new[len(old):]
    return old, new


def _applies(rule: tuple[str, str], dictionary: str, conjugated: str) -> bool:
    old, new = rule
    return dictionary.endswith(old) and dictionary[:len(dictionary) - len(old)] + new == conjugated


def _row(form, sample: Sample) -> dict[str, Any] | None:
    result = form.conjugate(Word(sample.kanji, sample.hiragana, sample.word_type))
    if result is None:
        return None

    old, new = rule_of(sample.word_type, sample.hiragana, result.hiragana)
    return {
        'word_type': sample.word_type.value,
        'trigger': trigger_of_sample(sample),
        'exception': sample.exception,
        'ending': old,
        'replacement': new,
        'example': {
            'kanji': sample.kanji,
            'hiragana': sample.hiragana,
            'english': sample.english,
            'result_kanji': result.kanji,
            'result_hiragana': result.hiragana,
        },
        'transformations': [
            {
                'unaltered': t.unaltered,
                'altered_part': t.altered_part,
                'alteration': t.alteration,
                'operation': t.operation,
            }
            for t in result.transformations
        ],
    }


def form_rules(form, word_types: tuple[WordType, ...]) -> list[dict[str, Any]]:
    """Rows for one form, in sample order; exceptions only where they differ.

    The same form class serves adjectives and verbs, so the group decides which
    word types belong in the table.
    """
    rows: list[dict[str, Any]] = []
    regular: dict[tuple[WordType, str], dict[str, Any]] = {}

    for sample in SAMPLES:
        if sample.word_type not in word_types:
            continue
        row = _row(form, sample)
        if row is None:
            continue

        key = (sample.word_type, row['trigger'])
        if not sample.exception:
            regular[key] = row
        else:
            base = regular.get(key)
            if base is not None and _applies(
                (base['ending'], base['replacement']),
                sample.hiragana,
                row['example']['result_hiragana'],
            ):
                continue
        rows.append(row)

    return rows


def rules_catalog() -> list[dict[str, Any]]:
    """Every settings group with its prose and, per form, the rule table."""
    return [
        {
            'category': category,
            'title': title,
            **GROUP_TEXTS[(category, title)],
            'forms': [
                {
                    'form_key': key,
                    'title': form.title,
                    'settings_title': form.settings_title,
                    'rules': form_rules(
                        form,
                        ADJECTIVE_TYPES if category == 'Adjectives' else VERB_TYPES,
                    ),
                }
                for key, form in forms.items()
            ],
        }
        for category, title, forms in FORM_GROUPS
    ]

