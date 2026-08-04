"""The word set every form is tested against.

Same words and same case labels as the original Jasmine specs — one entry per
godan ending, both irregular verbs, both adjective types and the two words with
their own rule (良い, 呉れる).
"""

from app.conjugation import Conjugation, Word, WordType

SOURCE_WORDS: dict[str, tuple[str, str, WordType]] = {
    'Ichidan Verb': ('食べる', 'たべる', WordType.ICHIDAN_VERB),
    'Ichidan Verb [呉れる]': ('呉れる', 'くれる', WordType.ICHIDAN_VERB),
    'Godan Verb [う]': ('会う', 'あう', WordType.GODAN_VERB),
    'Godan Verb [つ]': ('待つ', 'まつ', WordType.GODAN_VERB),
    'Godan Verb [る]': ('取る', 'とる', WordType.GODAN_VERB),
    'Godan Verb [む]': ('読む', 'よむ', WordType.GODAN_VERB),
    'Godan Verb [ぶ]': ('遊ぶ', 'あそぶ', WordType.GODAN_VERB),
    'Godan Verb [ぬ]': ('死ぬ', 'しぬ', WordType.GODAN_VERB),
    'Godan Verb [く]': ('書く', 'かく', WordType.GODAN_VERB),
    'Godan Verb [ぐ]': ('泳ぐ', 'およぐ', WordType.GODAN_VERB),
    'Godan Verb [す]': ('話す', 'はなす', WordType.GODAN_VERB),
    'Godan Verb [行く]': ('行く', 'いく', WordType.GODAN_VERB),
    'Suru Verb': ('勉強する', 'べんきょうする', WordType.SURU_VERB),
    'Kuru Verb': ('来る', 'くる', WordType.KURU_VERB),
    'I-Adjective': ('美味しい', 'おいしい', WordType.I_ADJECTIVE),
    'I-Adjective [良い]': ('良い', 'よい', WordType.I_ADJECTIVE),
    'Na-Adjective': ('好き', 'すき', WordType.NA_ADJECTIVE),
}


def assert_conjugates(
    conjugation: Conjugation,
    case: str,
    kanji: str,
    hiragana: str,
) -> None:
    source_kanji, source_hiragana, word_type = SOURCE_WORDS[case]
    result = conjugation.conjugate(Word(source_kanji, source_hiragana, word_type))

    assert result is not None
    assert result == Word(kanji, hiragana, word_type)
