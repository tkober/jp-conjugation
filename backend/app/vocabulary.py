"""Loading the vocabulary the conjugation engine practises on.

One JSON file per source, each mapping a word type to its entries:

    {"godan_verb": [{"kanji": …, "hiragana": …, "english": …, "jlpt": …}, …], …}

Files are read in path order so the result is deterministic.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path

from .conjugation import WordType

DEFAULT_VOCABULARY_DIR = Path(__file__).resolve().parents[2] / 'data' / 'vocabulary'

REQUIRED_KEYS = frozenset({'kanji', 'hiragana', 'english', 'jlpt'})


@dataclass(frozen=True)
class VocabularyEntry:
    kanji: str
    hiragana: str
    english: str
    jlpt: str
    word_type: WordType
    source: str


def vocabulary_dir() -> Path:
    return Path(os.environ.get('VOCABULARY_DIR', DEFAULT_VOCABULARY_DIR))


def load_vocabulary(directory: Path | None = None) -> list[VocabularyEntry]:
    directory = directory or vocabulary_dir()

    entries: list[VocabularyEntry] = []
    for path in sorted(directory.glob('*.json')):
        source = path.stem
        raw = json.loads(path.read_text(encoding='utf-8'))

        for type_key, items in raw.items():
            word_type = WordType(type_key)
            for item in items:
                missing = REQUIRED_KEYS - item.keys()
                if missing:
                    raise ValueError(
                        f'{path.name}: {type_key} entry {item!r} is missing {sorted(missing)}'
                    )

                entries.append(VocabularyEntry(
                    kanji=item['kanji'],
                    hiragana=item['hiragana'],
                    english=item['english'],
                    jlpt=item['jlpt'],
                    word_type=word_type,
                    source=source,
                ))

    return entries
