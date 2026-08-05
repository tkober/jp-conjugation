import pytest

from app.conjugation.forms.causative_passive_affirmative import CausativePassiveAffirmative

from .cases import assert_conjugates


@pytest.mark.parametrize(('case', 'kanji', 'hiragana'), [
    ('Ichidan Verb', '食べさせられる', 'たべさせられる'),
    ('Godan Verb [う]', '会わせられる', 'あわせられる'),
    ('Godan Verb [つ]', '待たせられる', 'またせられる'),
    ('Godan Verb [る]', '取らせられる', 'とらせられる'),
    ('Godan Verb [む]', '読ませられる', 'よませられる'),
    ('Godan Verb [ぶ]', '遊ばせられる', 'あそばせられる'),
    ('Godan Verb [ぬ]', '死なせられる', 'しなせられる'),
    ('Godan Verb [く]', '書かせられる', 'かかせられる'),
    ('Godan Verb [ぐ]', '泳がせられる', 'およがせられる'),
    ('Godan Verb [す]', '話させられる', 'はなさせられる'),
    ('Godan Verb [行く]', '行かせられる', 'いかせられる'),
    ('Suru Verb', '勉強させられる', 'べんきょうさせられる'),
    ('Kuru Verb', '来させられる', 'こさせられる'),
])
def test_causative_passive_affirmative(case: str, kanji: str, hiragana: str) -> None:
    assert_conjugates(CausativePassiveAffirmative(), case, kanji, hiragana)
