"""The rules section, without a DB: prose for every group, tables from the engine."""

import pytest

from app.conjugation import ADJECTIVE_TYPES, FORM_GROUPS, VERB_TYPES, WordType
from app.practice import GODAN_ENDINGS
from app.rules import GROUP_TEXTS, SAMPLES, rule_of, rules_catalog

CATALOG = rules_catalog()
ROWS = [
    (form['form_key'], row)
    for group in CATALOG
    for form in group['forms']
    for row in form['rules']
]


def test_every_group_and_form_is_covered() -> None:
    assert [(g['category'], g['title']) for g in CATALOG] == [
        (category, title) for category, title, _ in FORM_GROUPS
    ]
    assert set(GROUP_TEXTS) == {(category, title) for category, title, _ in FORM_GROUPS}

    for group, (_, _, forms) in zip(CATALOG, FORM_GROUPS):
        assert group['summary'] and group['build']
        assert [f['form_key'] for f in group['forms']] == list(forms)


def test_every_godan_ending_has_a_regular_sample() -> None:
    assert {
        s.hiragana[-1] for s in SAMPLES
        if s.word_type is WordType.GODAN_VERB and not s.exception
    } == set(GODAN_ENDINGS)


def test_groups_only_show_their_own_word_types() -> None:
    for group in CATALOG:
        allowed = ADJECTIVE_TYPES if group['category'] == 'Adjectives' else VERB_TYPES
        for form in group['forms']:
            assert {r['word_type'] for r in form['rules']} == {t.value for t in allowed}


@pytest.mark.parametrize('form_key,row', ROWS, ids=lambda v: v if isinstance(v, str) else '')
def test_the_rule_reproduces_its_example(form_key, row) -> None:
    ending, replacement = row['ending'], row['replacement']
    example = row['example']

    assert example['hiragana'].endswith(ending)
    stem = example['hiragana'][:len(example['hiragana']) - len(ending)]
    assert stem + replacement == example['result_hiragana']
    if ending or replacement:
        assert row['transformations'], 'every change shows how it was derived'
        assert row['transformations'][-1]['alteration'] in example['result_kanji']


def test_exceptions_only_where_they_break_the_rule() -> None:
    exceptions = sorted(
        (form_key, row['example']['kanji']) for form_key, row in ROWS if row['exception']
    )

    assert exceptions == sorted([
        ('Adjectives__NonPastShortAffirmative', '良い'),
        ('Adjectives__NonPastPoliteAffirmative', '良い'),
        ('Verbs__PastShortAffirmative', '行く'),
        ('Verbs__TeFormAffirmative', '行く'),
        ('Verbs__ImperativeAffirmative', '呉れる'),
    ])


@pytest.mark.parametrize('word_type,dictionary,conjugated,expected', [
    (WordType.GODAN_VERB, 'あう', 'あわない', ('う', 'わない')),
    (WordType.SURU_VERB, 'べんきょうする', 'べんきょうします', ('する', 'します')),
    (WordType.KURU_VERB, 'くる', 'こない', ('くる', 'こない')),
    (WordType.NA_ADJECTIVE, 'すき', 'すきじゃない', ('', 'じゃない')),
    (WordType.ICHIDAN_VERB, 'たべる', 'たべるな', ('', 'な')),
    (WordType.GODAN_VERB, 'あう', 'あう', ('', '')),
    (WordType.I_ADJECTIVE, 'よい', 'いい', ('よい', 'いい')),
])
def test_rule_of(word_type, dictionary, conjugated, expected) -> None:
    assert rule_of(word_type, dictionary, conjugated) == expected
