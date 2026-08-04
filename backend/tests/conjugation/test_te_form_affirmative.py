import pytest

from app.conjugation.forms.te_form_affirmative import TeFormAffirmative

from .cases import assert_conjugates


@pytest.mark.parametrize(('case', 'kanji', 'hiragana'), [
    ('Ichidan Verb', '食べて', 'たべて'),
    ('Godan Verb [う]', '会って', 'あって'),
    ('Godan Verb [つ]', '待って', 'まって'),
    ('Godan Verb [る]', '取って', 'とって'),
    ('Godan Verb [む]', '読んで', 'よんで'),
    ('Godan Verb [ぶ]', '遊んで', 'あそんで'),
    ('Godan Verb [ぬ]', '死んで', 'しんで'),
    ('Godan Verb [く]', '書いて', 'かいて'),
    ('Godan Verb [ぐ]', '泳いで', 'およいで'),
    ('Godan Verb [す]', '話して', 'はなして'),
    ('Godan Verb [行く]', '行って', 'いって'),
    ('Suru Verb', '勉強して', 'べんきょうして'),
    ('Kuru Verb', '来て', 'きて'),
])
def test_te_form_affirmative(case: str, kanji: str, hiragana: str) -> None:
    assert_conjugates(TeFormAffirmative(), case, kanji, hiragana)
