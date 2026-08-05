import pytest

from app.conjugation.forms.non_past_polite_negative import NonPastPoliteNegative

from .cases import assert_conjugates


@pytest.mark.parametrize(('case', 'kanji', 'hiragana'), [
    ('Ichidan Verb', '食べません', 'たべません'),
    ('Godan Verb [う]', '会いません', 'あいません'),
    ('Godan Verb [つ]', '待ちません', 'まちません'),
    ('Godan Verb [る]', '取りません', 'とりません'),
    ('Godan Verb [む]', '読みません', 'よみません'),
    ('Godan Verb [ぶ]', '遊びません', 'あそびません'),
    ('Godan Verb [ぬ]', '死にません', 'しにません'),
    ('Godan Verb [く]', '書きません', 'かきません'),
    ('Godan Verb [ぐ]', '泳ぎません', 'およぎません'),
    ('Godan Verb [す]', '話しません', 'はなしません'),
    ('Godan Verb [行く]', '行きません', 'いきません'),
    ('Suru Verb', '勉強しません', 'べんきょうしません'),
    ('Kuru Verb', '来ません', 'きません'),
    ('I-Adjective', '美味しくないです', 'おいしくないです'),
    ('I-Adjective [良い]', '良くないです', 'よくないです'),
    ('Na-Adjective', '好きじゃないです', 'すきじゃないです'),
])
def test_non_past_polite_negative(case: str, kanji: str, hiragana: str) -> None:
    assert_conjugates(NonPastPoliteNegative(), case, kanji, hiragana)
