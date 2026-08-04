import pytest

from app.answer import common_prefix, evaluate, normalize, to_hiragana


@pytest.mark.parametrize(('raw', 'expected'), [
    ('コピーします', 'こぴーします'),
    ('バテる', 'ばてる'),
    ('たべた', 'たべた'),
    ('  よんで ', 'よんで'),
    ('よん　で', 'よんで'),
])
def test_normalize(raw: str, expected: str) -> None:
    assert normalize(raw) == expected


def test_to_hiragana_leaves_the_long_vowel_mark() -> None:
    assert to_hiragana('コピー') == 'こぴー'


@pytest.mark.parametrize(('a', 'b', 'expected'), [
    ('よむ', 'よんで', 'よ'),
    ('およぐ', 'およいで', 'およ'),
    ('べんきょうする', 'べんきょうしない', 'べんきょう'),
    ('くる', 'こない', ''),
    ('たべる', 'たべる', 'たべる'),
])
def test_common_prefix(a: str, b: str, expected: str) -> None:
    assert common_prefix(a, b) == expected


def test_correct_answer() -> None:
    result = evaluate('よむ', 'よんで', 'よんで')

    assert result.correct
    assert result.stem_correct
    assert result.ending_correct
    assert (result.stem, result.ending) == ('よ', 'んで')


def test_wrong_ending_keeps_the_stem() -> None:
    """The classic te-form mix-up: む treated like ぐ."""
    result = evaluate('およぐ', 'およいで', 'およんで')

    assert not result.correct
    assert result.stem_correct
    assert not result.ending_correct


def test_wrong_stem_with_the_right_rule() -> None:
    """Rule applied correctly, word misread — the two are worth telling apart."""
    result = evaluate('およぐ', 'およいで', 'あよいで')

    assert not result.correct
    assert not result.stem_correct
    assert result.ending_correct


def test_both_parts_wrong() -> None:
    result = evaluate('およぐ', 'およいで', 'あよんだ')

    assert not result.correct
    assert not result.stem_correct
    assert not result.ending_correct


def test_katakana_word_is_answerable_in_hiragana() -> None:
    """The 96 loanword entries were unanswerable in the old app."""
    result = evaluate('コピーする', 'コピーします', 'こぴーします')

    assert result.correct


def test_irregular_has_no_stem_to_get_right() -> None:
    result = evaluate('くる', 'こない', 'きない')

    assert not result.correct
    assert result.stem == ''
    assert result.stem_correct  # nothing to match, so trivially true
    assert not result.ending_correct


def test_empty_answer_is_not_correct() -> None:
    result = evaluate('よむ', 'よんで', '')

    assert not result.correct
    assert not result.ending_correct
