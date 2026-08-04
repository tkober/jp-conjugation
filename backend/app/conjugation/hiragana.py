from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class HiraganaGroup:
    a: str
    i: str
    u: str
    e: str
    o: str


HIRAGANA_GROUPS: dict[str, HiraganaGroup] = {
    '-': HiraganaGroup(a='あ', i='い', u='う', e='え', o='お'),
    'k': HiraganaGroup(a='か', i='き', u='く', e='け', o='こ'),
    's': HiraganaGroup(a='さ', i='し', u='す', e='せ', o='そ'),
    't': HiraganaGroup(a='た', i='ち', u='つ', e='て', o='と'),
    'n': HiraganaGroup(a='な', i='に', u='ぬ', e='ね', o='の'),
    'h': HiraganaGroup(a='は', i='ひ', u='ふ', e='へ', o='ほ'),
    'm': HiraganaGroup(a='ま', i='み', u='む', e='め', o='も'),
    'r': HiraganaGroup(a='ら', i='り', u='る', e='れ', o='ろ'),
    'g': HiraganaGroup(a='が', i='ぎ', u='ぐ', e='げ', o='ご'),
    'z': HiraganaGroup(a='ざ', i='じ', u='ず', e='ぜ', o='ぞ'),
    'd': HiraganaGroup(a='だ', i='ぢ', u='づ', e='で', o='ど'),
    'b': HiraganaGroup(a='ば', i='び', u='ぶ', e='べ', o='ぼ'),
    'p': HiraganaGroup(a='ぱ', i='ぴ', u='ぷ', e='ぺ', o='ぽ'),
}


@dataclass(frozen=True)
class Hiragana:
    kana: str
    romanji: str
    consonant: str

    @property
    def group(self) -> HiraganaGroup:
        return HIRAGANA_GROUPS[self.consonant]


def _kana(kana: str, romanji: str, consonant: str) -> tuple[str, Hiragana]:
    return kana, Hiragana(kana=kana, romanji=romanji, consonant=consonant)


HIRAGANA: dict[str, Hiragana] = dict([
    _kana('あ', 'a', '-'),
    _kana('い', 'i', '-'),
    _kana('う', 'u', '-'),
    _kana('え', 'e', '-'),
    _kana('お', 'o', '-'),
    _kana('か', 'ka', 'k'),
    _kana('き', 'ki', 'k'),
    _kana('く', 'ku', 'k'),
    _kana('け', 'ke', 'k'),
    _kana('こ', 'ko', 'k'),
    _kana('さ', 'sa', 's'),
    _kana('し', 'shi', 's'),
    _kana('す', 'su', 's'),
    _kana('せ', 'se', 's'),
    _kana('そ', 'so', 's'),
    _kana('た', 'ta', 't'),
    _kana('ち', 'chi', 't'),
    _kana('つ', 'tsu', 't'),
    _kana('て', 'te', 't'),
    _kana('と', 'to', 't'),
    _kana('な', 'na', 'n'),
    _kana('に', 'ni', 'n'),
    _kana('ぬ', 'nu', 'n'),
    _kana('ね', 'ne', 'n'),
    _kana('の', 'no', 'n'),
    _kana('は', 'ha', 'h'),
    _kana('ひ', 'hi', 'h'),
    _kana('ふ', 'fu', 'h'),
    _kana('へ', 'he', 'h'),
    _kana('ほ', 'ho', 'h'),
    _kana('ま', 'ma', 'm'),
    _kana('み', 'mi', 'm'),
    _kana('む', 'mu', 'm'),
    _kana('め', 'me', 'm'),
    _kana('も', 'mo', 'm'),
    _kana('や', 'ya', 'y'),
    _kana('ゆ', 'yu', 'y'),
    _kana('よ', 'yo', 'y'),
    _kana('ら', 'ra', 'r'),
    _kana('り', 'ri', 'r'),
    _kana('る', 'ru', 'r'),
    _kana('れ', 're', 'r'),
    _kana('ろ', 'ro', 'r'),
    _kana('わ', 'wa', 'w'),
    _kana('を', 'wo', 'w'),
    _kana('ん', 'n', 'nn'),
    _kana('が', 'ga', 'g'),
    _kana('ぎ', 'gi', 'g'),
    _kana('ぐ', 'gu', 'g'),
    _kana('げ', 'ge', 'g'),
    _kana('ご', 'go', 'g'),
    _kana('ざ', 'za', 'z'),
    _kana('じ', 'ji', 'z'),
    _kana('ず', 'zu', 'z'),
    _kana('ぜ', 'ze', 'z'),
    _kana('ぞ', 'zo', 'z'),
    _kana('だ', 'da', 'd'),
    _kana('ぢ', 'ji', 'd'),
    _kana('づ', 'zu', 'd'),
    _kana('で', 'de', 'd'),
    _kana('ど', 'do', 'd'),
    _kana('ば', 'ba', 'b'),
    _kana('び', 'bi', 'b'),
    _kana('ぶ', 'bu', 'b'),
    _kana('べ', 'be', 'b'),
    _kana('ぼ', 'bo', 'b'),
    _kana('ぱ', 'pa', 'p'),
    _kana('ぴ', 'pi', 'p'),
    _kana('ぷ', 'pu', 'p'),
    _kana('ぺ', 'pe', 'p'),
    _kana('ぽ', 'po', 'p'),

    # Digraphs
    _kana('きゃ', 'kya', 'k'),
    _kana('きゅ', 'kyu', 'k'),
    _kana('きょ', 'kyo', 'k'),
    _kana('しゃ', 'sha', 's'),
    _kana('しゅ', 'shu', 's'),
    _kana('しょ', 'sho', 's'),
    _kana('ちゃ', 'cha', 't'),
    _kana('ちゅ', 'chu', 't'),
    _kana('ちょ', 'cho', 't'),
    _kana('にゃ', 'nya', 'n'),
    _kana('にゅ', 'nyu', 'n'),
    _kana('にょ', 'nyo', 'n'),
    _kana('ひゃ', 'hya', 'h'),
    _kana('ひゅ', 'hyu', 'h'),
    _kana('ひょ', 'hyo', 'h'),
    _kana('みゃ', 'mya', 'm'),
    _kana('みゅ', 'myu', 'm'),
    _kana('みょ', 'myo', 'm'),
    _kana('りゃ', 'rya', 'r'),
    _kana('りゅ', 'ryu', 'r'),
    _kana('りょ', 'ryo', 'r'),
    _kana('ぎゃ', 'gya', 'g'),
    _kana('ぎゅ', 'gyu', 'g'),
    _kana('ぎょ', 'gyo', 'g'),
    _kana('じゃ', 'ja', 'j'),
    _kana('じゅ', 'ju', 'j'),
    _kana('じょ', 'jo', 'j'),
    _kana('びゃ', 'bya', 'b'),
    _kana('びゅ', 'byu', 'b'),
    _kana('びょ', 'byo', 'b'),
    _kana('ぴゃ', 'pya', 'p'),
    _kana('ぴゅ', 'pyu', 'p'),
    _kana('ぴょ', 'pyo', 'p'),
])
