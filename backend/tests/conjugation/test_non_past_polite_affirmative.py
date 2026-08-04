import pytest

from app.conjugation.forms.non_past_polite_affirmative import NonPastPoliteAffirmative

from .cases import assert_conjugates


@pytest.mark.parametrize(('case', 'kanji', 'hiragana'), [
    ('Ichidan Verb', '食べます', 'たべます'),
    ('Godan Verb [う]', '会います', 'あいます'),
    ('Godan Verb [つ]', '待ちます', 'まちます'),
    ('Godan Verb [る]', '取ります', 'とります'),
    ('Godan Verb [む]', '読みます', 'よみます'),
    ('Godan Verb [ぶ]', '遊びます', 'あそびます'),
    ('Godan Verb [ぬ]', '死にます', 'しにます'),
    ('Godan Verb [く]', '書きます', 'かきます'),
    ('Godan Verb [ぐ]', '泳ぎます', 'およぎます'),
    ('Godan Verb [す]', '話します', 'はなします'),
    ('Godan Verb [行く]', '行きます', 'いきます'),
    ('Suru Verb', '勉強します', 'べんきょうします'),
    ('Kuru Verb', '来ます', 'きます'),
    ('I-Adjective', '美味しいです', 'おいしいです'),
    ('I-Adjective [良い]', '良いです', 'いいです'),
    ('Na-Adjective', '好きです', 'すきです'),
])
def test_non_past_polite_affirmative(case: str, kanji: str, hiragana: str) -> None:
    assert_conjugates(NonPastPoliteAffirmative(), case, kanji, hiragana)
