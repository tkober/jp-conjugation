import { ItemStat } from '../../core/models';
import { TYPE_TITLES } from '../../shared/word-types';

/** A heatmap cell: one (form × word type) pair, or one godan ending. */
export interface Cell {
  key: string;
  label: string;
  attempts: number;
  correct: number;
  /** 0..4 bucket of the miss rate, or -1 when never practised. */
  heat: number;
  accuracy: number | null;
}

export interface HeatRow {
  formKey: string;
  title: string;
  cells: Cell[];
}

/** Point geometry for the Elo sparkline. */
export interface SparkLine {
  width: number;
  height: number;
  points: string;
  min: number;
  max: number;
}

export const VERB_TYPES = ['ichidan_verb', 'godan_verb', 'suru_verb', 'kuru_verb'];
export const ADJECTIVE_TYPES = ['i_adjective', 'na_adjective'];

// Miss rate, so the cells that need work are the ones that stand out.
export const HEAT_BOUNDS = [0.1, 0.25, 0.45, 0.7];
export const HEAT_LABELS = ['≤10%', '10–25%', '25–45%', '45–70%', '>70%'];

export function bucket(missRate: number): number {
  const index = HEAT_BOUNDS.findIndex((bound) => missRate <= bound);
  return index === -1 ? HEAT_BOUNDS.length : index;
}

/** Sum a group of items (godan spreads over nine triggers) into one cell. */
export function toCell(key: string, label: string, group: ItemStat[]): Cell {
  const attempts = group.reduce((n, i) => n + i.attempts, 0);
  const correct = group.reduce((n, i) => n + i.correct, 0);
  if (!attempts) {
    return { key, label, attempts: 0, correct: 0, heat: -1, accuracy: null };
  }
  const accuracy = correct / attempts;
  return { key, label, attempts, correct, heat: bucket(1 - accuracy), accuracy };
}

/** One heat row per form key that starts with `prefix`, one cell per type. */
export function rowsFor(items: ItemStat[], prefix: string, types: string[]): HeatRow[] {
  const forms = new Map<string, string>();
  for (const item of items) {
    if (item.form_key.startsWith(prefix)) {
      forms.set(item.form_key, item.title);
    }
  }

  return [...forms.entries()].map(([formKey, title]) => ({
    formKey,
    title,
    cells: types.map((type) =>
      toCell(
        `${formKey}-${type}`,
        `${title} · ${TYPE_TITLES[type] ?? type}`,
        items.filter((i) => i.form_key === formKey && i.word_type === type),
      ),
    ),
  }));
}

/** Groups godan items by their trigger (last kana) into one cell each,
 *  sorted in Japanese collation order. */
export function triggerCells(items: ItemStat[]): Cell[] {
  const godan = items.filter((i) => i.word_type === 'godan_verb' && i.trigger !== '-');
  const byTrigger = new Map<string, ItemStat[]>();
  for (const item of godan) {
    byTrigger.set(item.trigger, [...(byTrigger.get(item.trigger) ?? []), item]);
  }
  return [...byTrigger.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'ja'))
    .map(([trigger, group]) => toCell(trigger, `Godan ${trigger}`, group));
}

/** Point geometry for the Elo sparkline; null when there's not enough
 *  history to draw a line. */
export function sparkline(history: number[]): SparkLine | null {
  if (history.length < 2) {
    return null;
  }
  const width = 300;
  const height = 64;
  const pad = 3;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const span = Math.max(1, max - min);
  const points = history
    .map((value, index) => {
      const x = (index / (history.length - 1)) * width;
      const y = height - pad - ((value - min) / span) * (height - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return { width, height, points, min: Math.round(min), max: Math.round(max) };
}
