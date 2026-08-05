import pytest

from app.conjugation.forms.past_short_negative import PastShortNegative

from .cases import assert_conjugates


@pytest.mark.parametrize(('case', 'kanji', 'hiragana'), [
    ('Ichidan Verb', '食べなかった', 'たべなかった'),
    ('Godan Verb [う]', '会わなかった', 'あわなかった'),
    ('Godan Verb [つ]', '待たなかった', 'またなかった'),
    ('Godan Verb [る]', '取らなかった', 'とらなかった'),
    ('Godan Verb [む]', '読まなかった', 'よまなかった'),
    ('Godan Verb [ぶ]', '遊ばなかった', 'あそばなかった'),
    ('Godan Verb [ぬ]', '死ななかった', 'しななかった'),
    ('Godan Verb [く]', '書かなかった', 'かかなかった'),
    ('Godan Verb [ぐ]', '泳がなかった', 'およがなかった'),
    ('Godan Verb [す]', '話さなかった', 'はなさなかった'),
    ('Godan Verb [行く]', '行かなかった', 'いかなかった'),
    ('Suru Verb', '勉強しなかった', 'べんきょうしなかった'),
    ('Kuru Verb', '来なかった', 'こなかった'),
    ('I-Adjective', '美味しくなかった', 'おいしくなかった'),
    ('I-Adjective [良い]', '良くなかった', 'よくなかった'),
    ('Na-Adjective', '好きじゃなかった', 'すきじゃなかった'),
])
def test_past_short_negative(case: str, kanji: str, hiragana: str) -> None:
    assert_conjugates(PastShortNegative(), case, kanji, hiragana)
