import pytest

from app.conjugation.forms.te_form_negative import TeFormNegative

from .cases import assert_conjugates


@pytest.mark.parametrize(('case', 'kanji', 'hiragana'), [
    ('Ichidan Verb', '食べなくて', 'たべなくて'),
    ('Godan Verb [う]', '会わなくて', 'あわなくて'),
    ('Godan Verb [つ]', '待たなくて', 'またなくて'),
    ('Godan Verb [る]', '取らなくて', 'とらなくて'),
    ('Godan Verb [む]', '読まなくて', 'よまなくて'),
    ('Godan Verb [ぶ]', '遊ばなくて', 'あそばなくて'),
    ('Godan Verb [ぬ]', '死ななくて', 'しななくて'),
    ('Godan Verb [く]', '書かなくて', 'かかなくて'),
    ('Godan Verb [ぐ]', '泳がなくて', 'およがなくて'),
    ('Godan Verb [す]', '話さなくて', 'はなさなくて'),
    ('Godan Verb [行く]', '行かなくて', 'いかなくて'),
    ('Suru Verb', '勉強しなくて', 'べんきょうしなくて'),
    ('Kuru Verb', '来なくて', 'こなくて'),
])
def test_te_form_negative(case: str, kanji: str, hiragana: str) -> None:
    assert_conjugates(TeFormNegative(), case, kanji, hiragana)
