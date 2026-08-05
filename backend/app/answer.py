"""Grading a typed answer against the expected conjugation.

Two things happen here. First **normalisation**: the browser binds the input to
wanakana, so answers arrive as hiragana, while 96 vocabulary entries carry
katakana in their reading (バテる, コピーする — loanwords). Comparing those
verbatim can never match, so both sides are folded to hiragana. Displaying the
expected form keeps the katakana; only the comparison is folded.

Second the **stem/ending split**. The stem is the longest common prefix of the
dictionary form and the expected form — exactly the part the rule leaves alone
(よむ → よんで share よ). Everything after it is what the rule produced. Getting
the ending wrong (よんで vs よみで) is a different mistake from getting the stem
wrong, and the two feed the statistics separately.

Irregulars have no common prefix at all (くる → こない, よい → いい). There the
stem is empty and the whole answer is ending — which is the honest reading:
there is no rule to apply, only a form to know.
"""

from __future__ import annotations

from dataclasses import dataclass

_KATAKANA_START = 0x30A1
_KATAKANA_END = 0x30F6
_TO_HIRAGANA = _KATAKANA_START - 0x3041

_STRIPPED = str.maketrans('', '', ' \t\n　')


def to_hiragana(text: str) -> str:
    """Fold katakana to hiragana, leave everything else (ー, kanji) alone."""
    return ''.join(
        chr(ord(c) - _TO_HIRAGANA) if _KATAKANA_START <= ord(c) <= _KATAKANA_END else c
        for c in text
    )


def normalize(text: str) -> str:
    return to_hiragana(text.translate(_STRIPPED))


def common_prefix(a: str, b: str) -> str:
    limit = min(len(a), len(b))
    length = 0
    while length < limit and a[length] == b[length]:
        length += 1
    return a[:length]


@dataclass(frozen=True)
class Evaluation:
    correct: bool
    stem_correct: bool
    ending_correct: bool
    given: str
    expected: str
    stem: str
    ending: str


def evaluate(dictionary_form: str, expected: str, given: str) -> Evaluation:
    """Compare a typed answer to the expected form, all in reading (kana).

    ``dictionary_form`` is the unconjugated reading; it is only used to find
    where the stem ends.
    """
    expected_kana = normalize(expected)
    given_kana = normalize(given)
    stem = common_prefix(normalize(dictionary_form), expected_kana)
    ending = expected_kana[len(stem):]

    return Evaluation(
        correct=given_kana == expected_kana,
        stem_correct=given_kana.startswith(stem),
        ending_correct=given_kana[len(stem):] == ending,
        given=given_kana,
        expected=expected_kana,
        stem=stem,
        ending=ending,
    )
