import pytest

from app.conjugation.forms.imperative_affirmative import ImperativeAffirmative

from .cases import assert_conjugates


@pytest.mark.parametrize(('case', 'kanji', 'hiragana'), [
    ('Ichidan Verb', '食べろ', 'たべろ'),
    ('Ichidan Verb [呉れる]', '呉れ', 'くれ'),
    ('Godan Verb [う]', '会え', 'あえ'),
    ('Godan Verb [つ]', '待て', 'まて'),
    ('Godan Verb [る]', '取れ', 'とれ'),
    ('Godan Verb [む]', '読め', 'よめ'),
    ('Godan Verb [ぶ]', '遊べ', 'あそべ'),
    ('Godan Verb [ぬ]', '死ね', 'しね'),
    ('Godan Verb [く]', '書け', 'かけ'),
    ('Godan Verb [ぐ]', '泳げ', 'およげ'),
    ('Godan Verb [す]', '話せ', 'はなせ'),
    ('Godan Verb [行く]', '行け', 'いけ'),
    ('Suru Verb', '勉強しろ', 'べんきょうしろ'),
    ('Kuru Verb', '来い', 'こい'),
])
def test_imperative_affirmative(case: str, kanji: str, hiragana: str) -> None:
    assert_conjugates(ImperativeAffirmative(), case, kanji, hiragana)
