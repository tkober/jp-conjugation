import { describe, expect, it } from 'vitest';

import { TYPE_LABELS, TYPE_TITLES, wordTypeLabel, wordTypeTitle } from './word-types';

describe('wordTypeLabel', () => {
  it('returns the compact label for a known type', () => {
    expect(wordTypeLabel('ichidan_verb')).toBe('一段');
    expect(wordTypeLabel('godan_verb')).toBe('五段');
    expect(wordTypeLabel('suru_verb')).toBe('する');
    expect(wordTypeLabel('kuru_verb')).toBe('来る');
    expect(wordTypeLabel('i_adjective')).toBe('い');
    expect(wordTypeLabel('na_adjective')).toBe('な');
  });

  it('falls back to the raw type string when unknown', () => {
    expect(wordTypeLabel('some_unknown_type')).toBe('some_unknown_type');
  });

  it('covers every entry in TYPE_LABELS', () => {
    for (const [type, label] of Object.entries(TYPE_LABELS)) {
      expect(wordTypeLabel(type)).toBe(label);
    }
  });
});

describe('wordTypeTitle', () => {
  it('returns the spelled-out title for a known type', () => {
    expect(wordTypeTitle('ichidan_verb')).toBe('Ichidan verb');
    expect(wordTypeTitle('godan_verb')).toBe('Godan verb');
    expect(wordTypeTitle('suru_verb')).toBe('Suru verb');
    expect(wordTypeTitle('kuru_verb')).toBe('Kuru verb');
    expect(wordTypeTitle('i_adjective')).toBe('I-adjective');
    expect(wordTypeTitle('na_adjective')).toBe('Na-adjective');
  });

  it('falls back to the raw type string when unknown', () => {
    expect(wordTypeTitle('some_unknown_type')).toBe('some_unknown_type');
  });

  it('covers every entry in TYPE_TITLES', () => {
    for (const [type, title] of Object.entries(TYPE_TITLES)) {
      expect(wordTypeTitle(type)).toBe(title);
    }
  });
});
