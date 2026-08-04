import pytest

from app.conjugation.forms.imperative_negative import ImperativeNegative

from .cases import assert_conjugates


@pytest.mark.parametrize(('case', 'kanji', 'hiragana'), [
    ('Ichidan Verb', '食べるな', 'たべるな'),
    ('Godan Verb [う]', '会うな', 'あうな'),
    ('Godan Verb [つ]', '待つな', 'まつな'),
    ('Godan Verb [る]', '取るな', 'とるな'),
    ('Godan Verb [む]', '読むな', 'よむな'),
    ('Godan Verb [ぶ]', '遊ぶな', 'あそぶな'),
    ('Godan Verb [ぬ]', '死ぬな', 'しぬな'),
    ('Godan Verb [く]', '書くな', 'かくな'),
    ('Godan Verb [ぐ]', '泳ぐな', 'およぐな'),
    ('Godan Verb [す]', '話すな', 'はなすな'),
    ('Godan Verb [行く]', '行くな', 'いくな'),
    ('Suru Verb', '勉強するな', 'べんきょうするな'),
    ('Kuru Verb', '来るな', 'くるな'),
])
def test_imperative_negative(case: str, kanji: str, hiragana: str) -> None:
    assert_conjugates(ImperativeNegative(), case, kanji, hiragana)
