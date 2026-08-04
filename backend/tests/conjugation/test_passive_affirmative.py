import pytest

from app.conjugation.forms.passive_affirmative import PassiveAffirmative

from .cases import assert_conjugates


@pytest.mark.parametrize(('case', 'kanji', 'hiragana'), [
    ('Ichidan Verb', '食べられる', 'たべられる'),
    ('Godan Verb [う]', '会われる', 'あわれる'),
    ('Godan Verb [つ]', '待たれる', 'またれる'),
    ('Godan Verb [る]', '取られる', 'とられる'),
    ('Godan Verb [む]', '読まれる', 'よまれる'),
    ('Godan Verb [ぶ]', '遊ばれる', 'あそばれる'),
    ('Godan Verb [ぬ]', '死なれる', 'しなれる'),
    ('Godan Verb [く]', '書かれる', 'かかれる'),
    ('Godan Verb [ぐ]', '泳がれる', 'およがれる'),
    ('Godan Verb [す]', '話される', 'はなされる'),
    ('Godan Verb [行く]', '行かれる', 'いかれる'),
    ('Suru Verb', '勉強される', 'べんきょうされる'),
    ('Kuru Verb', '来られる', 'こられる'),
])
def test_passive_affirmative(case: str, kanji: str, hiragana: str) -> None:
    assert_conjugates(PassiveAffirmative(), case, kanji, hiragana)
