/* Splitting a word for <ruby>: which part carries a reading above it, and
   which part is okurigana that renders as-is.

   食べる / たべる  →  base 食, reading た, tail べる  →  食(た)べる

   Ported from the three pipes of the original app; wanakana does the
   tokenising, the reading falls out of stripping the shared tail. */
import * as wanakana from 'wanakana';

export interface Ruby {
  /** The part a reading is placed above — empty when there is no kanji. */
  base: string;
  /** The reading, or '' when none is needed. */
  reading: string;
  /** Trailing okurigana, rendered after the ruby. */
  tail: string;
}

interface DetailedToken {
  type: string;
  value: string;
}

function withoutHiragana(kanji: string): string {
  const tokens = wanakana.tokenize(kanji, {
    compact: false,
    detailed: true,
  }) as unknown as DetailedToken[];

  return tokens
    .filter((token) => token.type !== 'hiragana')
    .map((token) => token.value)
    .join('');
}

function trailingHiragana(kanji: string): string {
  const tokens = wanakana.tokenize(kanji);
  const last = tokens[tokens.length - 1];

  return typeof last === 'string' && wanakana.isHiragana(last) ? last : '';
}

export function ruby(kanji: string, hiragana: string): Ruby {
  const base = withoutHiragana(kanji);
  const tail = trailingHiragana(kanji);

  if (!base || !wanakana.isKanji(base)) {
    return { base: '', reading: '', tail: kanji };
  }

  // Strip everything the two spellings already share at the end; what remains
  // of the reading belongs above the kanji.
  let head = kanji;
  let reading = wanakana.toHiragana(hiragana);
  while (head.length > 0 && reading.length > 0 && head.slice(-1) === reading.slice(-1)) {
    head = head.slice(0, -1);
    reading = reading.slice(0, -1);
  }

  return { base, reading, tail };
}
