import pytest

from app.conjugation.forms.potential_affirmative import PotentialAffirmative

from .cases import assert_conjugates


@pytest.mark.parametrize(('case', 'kanji', 'hiragana'), [
    ('Ichidan Verb', '食べられる', 'たべられる'),
    ('Godan Verb [う]', '会える', 'あえる'),
    ('Godan Verb [つ]', '待てる', 'まてる'),
    ('Godan Verb [る]', '取れる', 'とれる'),
    ('Godan Verb [む]', '読める', 'よめる'),
    ('Godan Verb [ぶ]', '遊べる', 'あそべる'),
    ('Godan Verb [ぬ]', '死ねる', 'しねる'),
    ('Godan Verb [く]', '書ける', 'かける'),
    ('Godan Verb [ぐ]', '泳げる', 'およげる'),
    ('Godan Verb [す]', '話せる', 'はなせる'),
    ('Godan Verb [行く]', '行ける', 'いける'),
    ('Suru Verb', '勉強ができる', 'べんきょうができる'),
    ('Kuru Verb', '来られる', 'こられる'),
])
def test_potential_affirmative(case: str, kanji: str, hiragana: str) -> None:
    assert_conjugates(PotentialAffirmative(), case, kanji, hiragana)
