import { describe, expect, it } from 'vitest';

import { ItemStat } from '../../core/models';
import { rowsFor, toCell, triggerCells } from './stats-math';

function item(overrides: Partial<ItemStat> = {}): ItemStat {
  return {
    id: 1,
    form_key: 'Verbs__TeFormAffirmative',
    title: 'Te-form, positive',
    word_type: 'godan_verb',
    trigger: 'う',
    rating: 1000,
    attempts: 0,
    correct: 0,
    accuracy: null,
    last_served_at: null,
    ...overrides,
  };
}

describe('toCell', () => {
  it('reports null accuracy when never practised', () => {
    const cell = toCell('k', 'label', []);
    expect(cell.attempts).toBe(0);
    expect(cell.correct).toBe(0);
    expect(cell.accuracy).toBeNull();
  });

  it('sums attempts/correct across a group', () => {
    const group = [item({ attempts: 10, correct: 9 }), item({ attempts: 10, correct: 9 })];
    const cell = toCell('k', 'label', group);
    expect(cell.attempts).toBe(20);
    expect(cell.correct).toBe(18);
    expect(cell.accuracy).toBe(0.9);
  });
});

describe('rowsFor', () => {
  it('keeps only items matching the prefix, one row per form key', () => {
    const items = [
      item({ form_key: 'Verbs__TeFormAffirmative', title: 'Te-form, positive', word_type: 'godan_verb', attempts: 5, correct: 4 }),
      item({ form_key: 'Verbs__TeFormAffirmative', title: 'Te-form, positive', word_type: 'ichidan_verb', attempts: 0, correct: 0 }),
      item({ form_key: 'Adjectives__Negative', title: 'Negative', word_type: 'i_adjective', attempts: 1, correct: 1 }),
    ];
    const rows = rowsFor(items, 'Verbs__', ['godan_verb', 'ichidan_verb']);
    expect(rows).toHaveLength(1);
    expect(rows[0].formKey).toBe('Verbs__TeFormAffirmative');
    expect(rows[0].title).toBe('Te-form, positive');
    expect(rows[0].cells).toHaveLength(2);
    expect(rows[0].cells[0].attempts).toBe(5);
    expect(rows[0].cells[1].accuracy).toBeNull();
  });

  it('returns an empty list when nothing matches the prefix', () => {
    expect(rowsFor([item({ form_key: 'Adjectives__Negative' })], 'Verbs__', ['godan_verb'])).toEqual([]);
  });
});

describe('triggerCells', () => {
  it('groups godan items by trigger and sorts in Japanese order', () => {
    const items = [
      item({ trigger: 'ぶ', attempts: 2, correct: 1 }),
      item({ trigger: 'あ', attempts: 4, correct: 4 }),
      item({ trigger: 'ぶ', attempts: 2, correct: 2 }),
    ];
    const cells = triggerCells(items);
    expect(cells.map((c) => c.key)).toEqual(['あ', 'ぶ']);
    expect(cells.map((c) => c.label)).toEqual(['あ', 'ぶ']);
    const bu = cells.find((c) => c.key === 'ぶ')!;
    expect(bu.attempts).toBe(4);
    expect(bu.correct).toBe(3);
  });

  it('excludes non-godan items and the placeholder trigger "-"', () => {
    const items = [
      item({ word_type: 'ichidan_verb', trigger: '-', attempts: 5, correct: 5 }),
      item({ word_type: 'godan_verb', trigger: '-', attempts: 5, correct: 5 }),
    ];
    expect(triggerCells(items)).toEqual([]);
  });
});
