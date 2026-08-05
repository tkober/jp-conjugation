import pytest

from app.conjugation.forms.non_past_short_affirmative import NonPastShortAffirmative

from .cases import assert_conjugates


@pytest.mark.parametrize(('case', 'kanji', 'hiragana'), [
    ('Ichidan Verb', '食べる', 'たべる'),
    ('Godan Verb [う]', '会う', 'あう'),
    ('Godan Verb [つ]', '待つ', 'まつ'),
    ('Godan Verb [る]', '取る', 'とる'),
    ('Godan Verb [む]', '読む', 'よむ'),
    ('Godan Verb [ぶ]', '遊ぶ', 'あそぶ'),
    ('Godan Verb [ぬ]', '死ぬ', 'しぬ'),
    ('Godan Verb [く]', '書く', 'かく'),
    ('Godan Verb [ぐ]', '泳ぐ', 'およぐ'),
    ('Godan Verb [す]', '話す', 'はなす'),
    ('Godan Verb [行く]', '行く', 'いく'),
    ('Suru Verb', '勉強する', 'べんきょうする'),
    ('Kuru Verb', '来る', 'くる'),
    ('I-Adjective', '美味しい', 'おいしい'),
    ('I-Adjective [良い]', '良い', 'いい'),
    ('Na-Adjective', '好き', 'すき'),
])
def test_non_past_short_affirmative(case: str, kanji: str, hiragana: str) -> None:
    assert_conjugates(NonPastShortAffirmative(), case, kanji, hiragana)
