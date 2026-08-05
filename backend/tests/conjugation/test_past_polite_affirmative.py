import pytest

from app.conjugation.forms.past_polite_affirmative import PastPoliteAffirmative

from .cases import assert_conjugates


@pytest.mark.parametrize(('case', 'kanji', 'hiragana'), [
    ('Ichidan Verb', '食べました', 'たべました'),
    ('Godan Verb [う]', '会いました', 'あいました'),
    ('Godan Verb [つ]', '待ちました', 'まちました'),
    ('Godan Verb [る]', '取りました', 'とりました'),
    ('Godan Verb [む]', '読みました', 'よみました'),
    ('Godan Verb [ぶ]', '遊びました', 'あそびました'),
    ('Godan Verb [ぬ]', '死にました', 'しにました'),
    ('Godan Verb [く]', '書きました', 'かきました'),
    ('Godan Verb [ぐ]', '泳ぎました', 'およぎました'),
    ('Godan Verb [す]', '話しました', 'はなしました'),
    ('Godan Verb [行く]', '行きました', 'いきました'),
    ('Suru Verb', '勉強しました', 'べんきょうしました'),
    ('Kuru Verb', '来ました', 'きました'),
    ('I-Adjective', '美味しかったです', 'おいしかったです'),
    ('I-Adjective [良い]', '良かったです', 'よかったです'),
    ('Na-Adjective', '好きでした', 'すきでした'),
])
def test_past_polite_affirmative(case: str, kanji: str, hiragana: str) -> None:
    assert_conjugates(PastPoliteAffirmative(), case, kanji, hiragana)
