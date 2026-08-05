import pytest

from app.conjugation.forms.potential_negative import PotentialNegative

from .cases import assert_conjugates


@pytest.mark.parametrize(('case', 'kanji', 'hiragana'), [
    ('Ichidan Verb', '食べられない', 'たべられない'),
    ('Godan Verb [う]', '会えない', 'あえない'),
    ('Godan Verb [つ]', '待てない', 'まてない'),
    ('Godan Verb [る]', '取れない', 'とれない'),
    ('Godan Verb [む]', '読めない', 'よめない'),
    ('Godan Verb [ぶ]', '遊べない', 'あそべない'),
    ('Godan Verb [ぬ]', '死ねない', 'しねない'),
    ('Godan Verb [く]', '書けない', 'かけない'),
    ('Godan Verb [ぐ]', '泳げない', 'およげない'),
    ('Godan Verb [す]', '話せない', 'はなせない'),
    ('Godan Verb [行く]', '行けない', 'いけない'),
    ('Suru Verb', '勉強ができない', 'べんきょうができない'),
    ('Kuru Verb', '来られない', 'こられない'),
])
def test_potential_negative(case: str, kanji: str, hiragana: str) -> None:
    assert_conjugates(PotentialNegative(), case, kanji, hiragana)
