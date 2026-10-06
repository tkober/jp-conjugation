import { describe, expect, it } from 'vitest';

import { ItemStat } from '../../core/models';
import { bucket, rowsFor, sparkline, toCell, triggerCells } from './stats-math';

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

describe('bucket', () => {
  it('is 0 right at the lower boundary (10%)', () => {
    expect(bucket(0.1)).toBe(0);
  });

  it('is 1 right at the 25% boundary', () => {
    expect(bucket(0.25)).toBe(1);
  });

  it('is 2 right at the 45% boundary', () => {
    expect(bucket(0.45)).toBe(2);
  });

  it('is 3 right at the 70% boundary', () => {
    expect(bucket(0.7)).toBe(3);
  });

  it('is 4 just above the 70% boundary', () => {
    expect(bucket(0.700001)).toBe(4);
  });

  it('is 0 for a miss rate of 0', () => {
    expect(bucket(0)).toBe(0);
  });

  it('is 4 for a miss rate of 1', () => {
    expect(bucket(1)).toBe(4);
  });
});

describe('toCell', () => {
  it('reports heat -1 and null accuracy when never practised', () => {
    const cell = toCell('k', 'label', []);
    expect(cell.attempts).toBe(0);
    expect(cell.correct).toBe(0);
    expect(cell.heat).toBe(-1);
    expect(cell.accuracy).toBeNull();
  });

  it('sums attempts/correct across a group and buckets the miss rate', () => {
    const group = [item({ attempts: 10, correct: 9 }), item({ attempts: 10, correct: 9 })];
    const cell = toCell('k', 'label', group);
    expect(cell.attempts).toBe(20);
    expect(cell.correct).toBe(18);
    expect(cell.accuracy).toBe(0.9);
    // miss rate 0.1 -> bucket 0
    expect(cell.heat).toBe(0);
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
    expect(rows[0].cells[1].heat).toBe(-1);
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

describe('sparkline', () => {
  it('is null with fewer than two points', () => {
    expect(sparkline([])).toBeNull();
    expect(sparkline([1000])).toBeNull();
  });

  it('places the first and last point at x=0 and x=width', () => {
    const line = sparkline([1000, 1100, 1050])!;
    expect(line).not.toBeNull();
    const points = line.points.split(' ').map((p) => p.split(',').map(Number));
    expect(points[0][0]).toBe(0);
    expect(points[points.length - 1][0]).toBe(line.width);
    expect(line.min).toBe(1000);
    expect(line.max).toBe(1100);
  });

  it('centers a flat history (span clamped to 1) without dividing by zero', () => {
    const line = sparkline([1000, 1000])!;
    expect(line.min).toBe(1000);
    expect(line.max).toBe(1000);
    const points = line.points.split(' ').map((p) => p.split(',').map(Number));
    // Equal min/max collapses the y of both points to the same value.
    expect(points[0][1]).toBe(points[1][1]);
  });
});
