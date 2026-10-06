import { describe, expect, it } from 'vitest';

import { ruby } from './furigana';

describe('ruby', () => {
  it('splits a single-kanji verb into base, reading and okurigana tail', () => {
    // 食べる / たべる  →  食(た)べる
    expect(ruby('食べる', 'たべる')).toEqual({ base: '食', reading: 'た', tail: 'べる' });
  });

  it('splits a multi-kanji word, with the whole kanji run as the base', () => {
    // 勉強する / べんきょうする  →  勉強(べんきょう)する
    expect(ruby('勉強する', 'べんきょうする')).toEqual({
      base: '勉強',
      reading: 'べんきょう',
      tail: 'する',
    });
  });

  it('gives a pure-kana word no reading — base is empty, the whole word is the tail', () => {
    // する / する — no kanji at all, nothing to put a reading above.
    expect(ruby('する', 'する')).toEqual({ base: '', reading: '', tail: 'する' });
  });

  it('treats 行く as a regular single-kanji split despite being an engine exception', () => {
    // The exception lives in the conjugation engine, not in this purely
    // visual split — 行く splits just like any other single-kanji verb.
    expect(ruby('行く', 'いく')).toEqual({ base: '行', reading: 'い', tail: 'く' });
  });

  it('does not treat katakana in the kanji spelling as a kanji base', () => {
    // バテる has no kanji at all — the non-hiragana run is katakana (バテ),
    // and `wanakana.isKanji` rejects it, so `ruby()` falls back to the same
    // "no reading" shape as a pure-kana word, with the *kanji* argument
    // (identical to the reading here) as the tail. This is a case the old
    // vocabulary data actually contains (#96 entries with a katakana
    // reading, see CLAUDE.md "Vokabular"), so this behaviour matters in
    // practice, not just in theory.
    expect(ruby('バテる', 'ばてる')).toEqual({ base: '', reading: '', tail: 'バテる' });
  });
});
