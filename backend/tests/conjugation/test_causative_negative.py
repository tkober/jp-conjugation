import pytest

from app.conjugation.forms.causative_negative import CausativeNegative

from .cases import assert_conjugates


@pytest.mark.parametrize(('case', 'kanji', 'hiragana'), [
    ('Ichidan Verb', '食べさせない', 'たべさせない'),
    ('Godan Verb [う]', '会わせない', 'あわせない'),
    ('Godan Verb [つ]', '待たせない', 'またせない'),
    ('Godan Verb [る]', '取らせない', 'とらせない'),
    ('Godan Verb [む]', '読ませない', 'よませない'),
    ('Godan Verb [ぶ]', '遊ばせない', 'あそばせない'),
    ('Godan Verb [ぬ]', '死なせない', 'しなせない'),
    ('Godan Verb [く]', '書かせない', 'かかせない'),
    ('Godan Verb [ぐ]', '泳がせない', 'およがせない'),
    ('Godan Verb [す]', '話させない', 'はなさせない'),
    ('Godan Verb [行く]', '行かせない', 'いかせない'),
    ('Suru Verb', '勉強させない', 'べんきょうさせない'),
    ('Kuru Verb', '来させない', 'こさせない'),
])
def test_causative_negative(case: str, kanji: str, hiragana: str) -> None:
    assert_conjugates(CausativeNegative(), case, kanji, hiragana)
