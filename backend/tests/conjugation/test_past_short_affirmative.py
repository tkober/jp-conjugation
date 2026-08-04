import pytest

from app.conjugation.forms.past_short_affirmative import PastShortAffirmative

from .cases import assert_conjugates


@pytest.mark.parametrize(('case', 'kanji', 'hiragana'), [
    ('Ichidan Verb', '食べた', 'たべた'),
    ('Godan Verb [う]', '会った', 'あった'),
    ('Godan Verb [つ]', '待った', 'まった'),
    ('Godan Verb [る]', '取った', 'とった'),
    ('Godan Verb [む]', '読んだ', 'よんだ'),
    ('Godan Verb [ぶ]', '遊んだ', 'あそんだ'),
    ('Godan Verb [ぬ]', '死んだ', 'しんだ'),
    ('Godan Verb [く]', '書いた', 'かいた'),
    ('Godan Verb [ぐ]', '泳いだ', 'およいだ'),
    ('Godan Verb [す]', '話した', 'はなした'),
    ('Godan Verb [行く]', '行った', 'いった'),
    ('Suru Verb', '勉強した', 'べんきょうした'),
    ('Kuru Verb', '来た', 'きた'),
    ('I-Adjective', '美味しかった', 'おいしかった'),
    ('I-Adjective [良い]', '良かった', 'よかった'),
    ('Na-Adjective', '好きだった', 'すきだった'),
])
def test_past_short_affirmative(case: str, kanji: str, hiragana: str) -> None:
    assert_conjugates(PastShortAffirmative(), case, kanji, hiragana)
