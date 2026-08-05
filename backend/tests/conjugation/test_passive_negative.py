import pytest

from app.conjugation.forms.passive_negative import PassiveNegative

from .cases import assert_conjugates


@pytest.mark.parametrize(('case', 'kanji', 'hiragana'), [
    ('Ichidan Verb', '食べられない', 'たべられない'),
    ('Godan Verb [う]', '会われない', 'あわれない'),
    ('Godan Verb [つ]', '待たれない', 'またれない'),
    ('Godan Verb [る]', '取られない', 'とられない'),
    ('Godan Verb [む]', '読まれない', 'よまれない'),
    ('Godan Verb [ぶ]', '遊ばれない', 'あそばれない'),
    ('Godan Verb [ぬ]', '死なれない', 'しなれない'),
    ('Godan Verb [く]', '書かれない', 'かかれない'),
    ('Godan Verb [ぐ]', '泳がれない', 'およがれない'),
    ('Godan Verb [す]', '話されない', 'はなされない'),
    ('Godan Verb [行く]', '行かれない', 'いかれない'),
    ('Suru Verb', '勉強されない', 'べんきょうされない'),
    ('Kuru Verb', '来られない', 'こられない'),
])
def test_passive_negative(case: str, kanji: str, hiragana: str) -> None:
    assert_conjugates(PassiveNegative(), case, kanji, hiragana)
