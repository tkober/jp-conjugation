"""The engine has to cope with the whole vocabulary, not just the spec words.

This is the counterpart to the per-form tests: those check that a rule is
right, this one checks that no rule silently gives up. A form returning None
here means the app would have an exercise it cannot solve.
"""

from app.conjugation import (
    ADJECTIVE_FORMS,
    ADJECTIVE_TYPES,
    VERB_FORMS,
    Word,
    WordType,
)
from app.vocabulary import load_vocabulary


def forms_for(word_type: WordType) -> dict:
    return ADJECTIVE_FORMS if word_type in ADJECTIVE_TYPES else VERB_FORMS


def test_vocabulary_loads() -> None:
    entries = load_vocabulary()

    assert len(entries) > 3000
    assert {e.word_type for e in entries} == set(WordType)


def test_entries_are_unique_and_keep_the_easiest_level() -> None:
    entries = load_vocabulary()
    keys = [(e.word_type, e.kanji, e.hiragana) for e in entries]

    assert len(keys) == len(set(keys))

    # 上げる is listed under N5, N4 and N2 in the raw crawl.
    ageru = next(e for e in entries if e.kanji == '上げる' and e.hiragana == 'あげる')
    assert ageru.jlpt == 'n5'


def test_suru_verbs_carry_exactly_one_suru() -> None:
    doubled = [
        f'{e.kanji} / {e.hiragana}'
        for e in load_vocabulary()
        if e.word_type is WordType.SURU_VERB and e.hiragana.endswith('するする')
    ]

    assert not doubled, doubled[:5]


def test_every_entry_conjugates_in_every_applicable_form() -> None:
    gaps = []

    for entry in load_vocabulary():
        for form_key, form in forms_for(entry.word_type).items():
            word = Word(entry.kanji, entry.hiragana, entry.word_type)
            if form.conjugate(word) is None:
                gaps.append(f'{form_key}: {entry.kanji} / {entry.hiragana}')

    assert not gaps, f'{len(gaps)} conjugations returned None, first: {gaps[:5]}'


def test_conjugation_never_shortens_a_word_to_nothing() -> None:
    """A rule that chops more kana than the word has would fail silently."""
    stumps = []

    for entry in load_vocabulary():
        for form_key, form in forms_for(entry.word_type).items():
            word = Word(entry.kanji, entry.hiragana, entry.word_type)
            result = form.conjugate(word)
            if result is not None and (not result.kanji or not result.hiragana):
                stumps.append(f'{form_key}: {entry.kanji} / {entry.hiragana}')

    assert not stumps, f'{len(stumps)} conjugations collapsed, first: {stumps[:5]}'
