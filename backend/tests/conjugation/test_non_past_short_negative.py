import pytest

from app.conjugation.forms.non_past_short_negative import NonPastShortNegative

from .cases import assert_conjugates


@pytest.mark.parametrize(('case', 'kanji', 'hiragana'), [
    ('Ichidan Verb', '食べない', 'たべない'),
    ('Godan Verb [う]', '会わない', 'あわない'),
    ('Godan Verb [つ]', '待たない', 'またない'),
    ('Godan Verb [る]', '取らない', 'とらない'),
    ('Godan Verb [む]', '読まない', 'よまない'),
    ('Godan Verb [ぶ]', '遊ばない', 'あそばない'),
    ('Godan Verb [ぬ]', '死なない', 'しなない'),
    ('Godan Verb [く]', '書かない', 'かかない'),
    ('Godan Verb [ぐ]', '泳がない', 'およがない'),
    ('Godan Verb [す]', '話さない', 'はなさない'),
    ('Godan Verb [行く]', '行かない', 'いかない'),
    ('Suru Verb', '勉強しない', 'べんきょうしない'),
    ('Kuru Verb', '来ない', 'こない'),
    ('I-Adjective', '美味しくない', 'おいしくない'),
    ('I-Adjective [良い]', '良くない', 'よくない'),
    ('Na-Adjective', '好きじゃない', 'すきじゃない'),
])
def test_non_past_short_negative(case: str, kanji: str, hiragana: str) -> None:
    assert_conjugates(NonPastShortNegative(), case, kanji, hiragana)
