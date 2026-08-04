import pytest

from app.conjugation.forms.past_polite_negative import PastPoliteNegative

from .cases import assert_conjugates


@pytest.mark.parametrize(('case', 'kanji', 'hiragana'), [
    ('Ichidan Verb', '食べませんでした', 'たべませんでした'),
    ('Godan Verb [う]', '会いませんでした', 'あいませんでした'),
    ('Godan Verb [つ]', '待ちませんでした', 'まちませんでした'),
    ('Godan Verb [る]', '取りませんでした', 'とりませんでした'),
    ('Godan Verb [む]', '読みませんでした', 'よみませんでした'),
    ('Godan Verb [ぶ]', '遊びませんでした', 'あそびませんでした'),
    ('Godan Verb [ぬ]', '死にませんでした', 'しにませんでした'),
    ('Godan Verb [く]', '書きませんでした', 'かきませんでした'),
    ('Godan Verb [ぐ]', '泳ぎませんでした', 'およぎませんでした'),
    ('Godan Verb [す]', '話しませんでした', 'はなしませんでした'),
    ('Godan Verb [行く]', '行きませんでした', 'いきませんでした'),
    ('Suru Verb', '勉強しませんでした', 'べんきょうしませんでした'),
    ('Kuru Verb', '来ませんでした', 'きませんでした'),
    ('I-Adjective', '美味しくなかったです', 'おいしくなかったです'),
    ('I-Adjective [良い]', '良くなかったです', 'よくなかったです'),
    ('Na-Adjective', '好きじゃなかったです', 'すきじゃなかったです'),
])
def test_past_polite_negative(case: str, kanji: str, hiragana: str) -> None:
    assert_conjugates(PastPoliteNegative(), case, kanji, hiragana)
