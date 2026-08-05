import pytest

from app.conjugation.forms.causative_passive_negative import CausativePassiveNegative

from .cases import assert_conjugates


@pytest.mark.parametrize(('case', 'kanji', 'hiragana'), [
    ('Ichidan Verb', '食べさせられない', 'たべさせられない'),
    ('Godan Verb [う]', '会わせられない', 'あわせられない'),
    ('Godan Verb [つ]', '待たせられない', 'またせられない'),
    ('Godan Verb [る]', '取らせられない', 'とらせられない'),
    ('Godan Verb [む]', '読ませられない', 'よませられない'),
    ('Godan Verb [ぶ]', '遊ばせられない', 'あそばせられない'),
    ('Godan Verb [ぬ]', '死なせられない', 'しなせられない'),
    ('Godan Verb [く]', '書かせられない', 'かかせられない'),
    ('Godan Verb [ぐ]', '泳がせられない', 'およがせられない'),
    ('Godan Verb [す]', '話させられない', 'はなさせられない'),
    ('Godan Verb [行く]', '行かせられない', 'いかせられない'),
    ('Suru Verb', '勉強させられない', 'べんきょうさせられない'),
    ('Kuru Verb', '来させられない', 'こさせられない'),
])
def test_causative_passive_negative(case: str, kanji: str, hiragana: str) -> None:
    assert_conjugates(CausativePassiveNegative(), case, kanji, hiragana)
