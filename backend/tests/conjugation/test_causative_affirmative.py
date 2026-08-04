import pytest

from app.conjugation.forms.causative_affirmative import CausativeAffirmative

from .cases import assert_conjugates


@pytest.mark.parametrize(('case', 'kanji', 'hiragana'), [
    ('Ichidan Verb', '食べさせる', 'たべさせる'),
    ('Godan Verb [う]', '会わせる', 'あわせる'),
    ('Godan Verb [つ]', '待たせる', 'またせる'),
    ('Godan Verb [る]', '取らせる', 'とらせる'),
    ('Godan Verb [む]', '読ませる', 'よませる'),
    ('Godan Verb [ぶ]', '遊ばせる', 'あそばせる'),
    ('Godan Verb [ぬ]', '死なせる', 'しなせる'),
    ('Godan Verb [く]', '書かせる', 'かかせる'),
    ('Godan Verb [ぐ]', '泳がせる', 'およがせる'),
    ('Godan Verb [す]', '話させる', 'はなさせる'),
    ('Godan Verb [行く]', '行かせる', 'いかせる'),
    ('Suru Verb', '勉強させる', 'べんきょうさせる'),
    ('Kuru Verb', '来させる', 'こさせる'),
])
def test_causative_affirmative(case: str, kanji: str, hiragana: str) -> None:
    assert_conjugates(CausativeAffirmative(), case, kanji, hiragana)
