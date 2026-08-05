"""Loading the vocabulary the conjugation engine practises on.

One JSON file per source, each mapping a word type to its entries:

    {"godan_verb": [{"kanji": …, "hiragana": …, "english": …, "jlpt": …}, …], …}

Files are read in path order so the result is deterministic.

jisho lists a word once per JLPT level it appears in, so the raw crawl carries
duplicates (上げる sits in N5, N4 and N2). They are collapsed on load, and the
easiest level wins — that is where a learner meets the word first, and it is
the level the word's starting difficulty should be derived from.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path

from .conjugation import WordType

DEFAULT_VOCABULARY_DIR = Path(__file__).resolve().parents[2] / 'data' / 'vocabulary'

REQUIRED_KEYS = frozenset({'kanji', 'hiragana', 'english', 'jlpt'})

# Easiest first — the order decides which duplicate survives.
JLPT_LEVELS = ('n5', 'n4', 'n3', 'n2', 'n1')


def jlpt_rank(jlpt: str) -> int:
    """0 for N5 … 4 for N1; anything unknown counts as hardest."""
    try:
        return JLPT_LEVELS.index(jlpt)
    except ValueError:
        return len(JLPT_LEVELS)


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

    best: dict[tuple[WordType, str, str], VocabularyEntry] = {}
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

                entry = VocabularyEntry(
                    kanji=item['kanji'],
                    hiragana=item['hiragana'],
                    english=item['english'],
                    jlpt=item['jlpt'],
                    word_type=word_type,
                    source=source,
                )
                key = (entry.word_type, entry.kanji, entry.hiragana)
                previous = best.get(key)
                if previous is None or jlpt_rank(entry.jlpt) < jlpt_rank(previous.jlpt):
                    best[key] = entry

    return list(best.values())
