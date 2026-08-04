from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import StrEnum


class WordType(StrEnum):
    ICHIDAN_VERB = 'ichidan_verb'
    GODAN_VERB = 'godan_verb'
    SURU_VERB = 'suru_verb'
    KURU_VERB = 'kuru_verb'
    I_ADJECTIVE = 'i_adjective'
    NA_ADJECTIVE = 'na_adjective'


ADJECTIVE_TYPES: tuple[WordType, ...] = (WordType.I_ADJECTIVE, WordType.NA_ADJECTIVE)
VERB_TYPES: tuple[WordType, ...] = (
    WordType.ICHIDAN_VERB,
    WordType.GODAN_VERB,
    WordType.SURU_VERB,
    WordType.KURU_VERB,
)


@dataclass
class Transformation:
    """One step of a derivation, e.g. 会 + って."""

    unaltered: str
    altered_part: str
    alteration: str
    operation: str
    previous_transformation: Transformation | None = None


class Word:
    """A word being conjugated.

    Mutable on purpose: the composed forms (past tense builds on the te-form,
    causative-passive on the causative) conjugate in place and hand the same
    instance on, which is what keeps the derivation a single chain.
    """

    def __init__(self, kanji: str, hiragana: str, word_type: WordType) -> None:
        self.kanji = kanji
        self.hiragana = hiragana
        self.word_type = word_type
        self.transformations: list[Transformation] = []
        self._current_explanation_element = kanji

    @property
    def last_kana(self) -> str:
        return self.hiragana[-1]

    def add_suffix(self, suffix: str) -> Word:
        self.kanji = self.kanji + suffix
        self.hiragana = self.hiragana + suffix

        self._add_transformation(Transformation(
            self._current_explanation_element,
            '',
            suffix,
            '+',
        ))
        return self

    def replace_last_kana(self, replacement: str, n: int = 1) -> Word:
        self.kanji = self.kanji[:-n] + replacement
        self.hiragana = self.hiragana[:-n] + replacement

        self._add_transformation(Transformation(
            self._current_explanation_element[:-n],
            self._current_explanation_element[-n:],
            replacement,
            '+',
        ))
        return self

    def change_type(self, new_type: WordType) -> Word:
        self.word_type = new_type
        return self

    def replace(self, kanji: str, hiragana: str) -> Word:
        self.kanji = kanji
        self.hiragana = hiragana

        self._add_transformation(Transformation(
            '',
            self._current_explanation_element,
            kanji,
            '->',
        ))
        return self

    def _add_transformation(self, transformation: Transformation) -> None:
        if self.transformations:
            transformation.previous_transformation = self.transformations[-1]

        self.transformations.append(transformation)
        self._current_explanation_element = transformation.alteration

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Word):
            return NotImplemented

        return (
            self.kanji == other.kanji
            and self.hiragana == other.hiragana
            and self.word_type == other.word_type
        )

    def __repr__(self) -> str:
        return f'Word({self.kanji!r}, {self.hiragana!r}, {self.word_type.value!r})'


class Conjugation(ABC):

    title: str
    settings_title: str

    @abstractmethod
    def conjugate(self, word: Word) -> Word | None:
        ...
