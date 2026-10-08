import { ItemStat } from '../../core/models';
import { TYPE_TITLES } from '../../shared/word-types';

/** A heatmap cell: one (form × word type) pair, or one godan ending.
 *  `accuracy` is `null` when the cell was never practised — the library's
 *  matrix heatmap treats that as its own "no data" state, not the lightest
 *  ramp step (see CLAUDE.md's Stats section). */
export interface Cell {
  key: string;
  label: string;
  attempts: number;
  correct: number;
  accuracy: number | null;
}

export interface HeatRow {
  formKey: string;
  title: string;
  cells: Cell[];
}

export const VERB_TYPES = ['ichidan_verb', 'godan_verb', 'suru_verb', 'kuru_verb'];
export const ADJECTIVE_TYPES = ['i_adjective', 'na_adjective'];

/** Sum a group of items (godan spreads over nine triggers) into one cell. */
export function toCell(key: string, label: string, group: ItemStat[]): Cell {
  const attempts = group.reduce((n, i) => n + i.attempts, 0);
  const correct = group.reduce((n, i) => n + i.correct, 0);
  if (!attempts) {
    return { key, label, attempts: 0, correct: 0, accuracy: null };
  }
  return { key, label, attempts, correct, accuracy: correct / attempts };
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
 *  sorted in Japanese collation order. The cell's `label` is the bare
 *  trigger kana — it is a matrix *column*, not a standalone chip anymore,
 *  so "Godan " belongs to the row, not here. */
export function triggerCells(items: ItemStat[]): Cell[] {
  const godan = items.filter((i) => i.word_type === 'godan_verb' && i.trigger !== '-');
  const byTrigger = new Map<string, ItemStat[]>();
  for (const item of godan) {
    byTrigger.set(item.trigger, [...(byTrigger.get(item.trigger) ?? []), item]);
  }
  return [...byTrigger.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'ja'))
    .map(([trigger, group]) => toCell(trigger, trigger, group));
}
