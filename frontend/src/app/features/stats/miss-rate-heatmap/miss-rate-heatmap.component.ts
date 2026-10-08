import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { SUMI_CHARTS, type SumiMatrixCellInput, type SumiMatrixCellSelection } from 'sumi-ui/charts';
import { SumiCard } from 'sumi-ui/layout';

import { ItemStat } from '../../../core/models';
import { wordTypeLabel, wordTypeTitle } from '../../../shared/word-types';
import { ADJECTIVE_TYPES, VERB_TYPES, rowsFor, triggerCells } from '../stats-math';

const GODAN_ROW = 'Godan';

type MatrixId = 'adjectives' | 'verbs' | 'godan';

/** One matrix: rows/columns as plain strings for `sumi-matrix-heatmap`,
 *  plus the word-type keys behind each column (adjectives/verbs) so a
 *  `cellSelect` can be turned back into a full, unambiguous label. */
interface Matrix {
  id: MatrixId;
  title: string;
  ariaLabel: string;
  rows: string[];
  columns: string[];
  cells: SumiMatrixCellInput[];
  /** Column label -> full title, e.g. "一段" -> "Ichidan verb". Empty for
   *  the godan matrix, whose single row already says "Godan". */
  columnTitles: Record<string, string>;
}

/** The currently selected cell, shared across all three matrices so only
 *  one of them ever shows a selection ring, and so the readout below them
 *  can name the cell unambiguously. */
interface Selection {
  matrix: MatrixId;
  row: string;
  column: string;
  value: number | null;
  detail?: string;
  /** "<form title> · <full word-type title>", or "Godan <trigger>". */
  label: string;
}

function toPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function missRateCells(
  rows: { title: string; cells: { label: string; attempts: number; correct: number; accuracy: number | null }[] }[],
  columnLabels: string[],
): SumiMatrixCellInput[] {
  const cells: SumiMatrixCellInput[] = [];
  for (const row of rows) {
    row.cells.forEach((cell, i) => {
      const column = columnLabels[i];
      if (cell.accuracy === null) {
        cells.push({ row: row.title, column, value: null, detail: 'not practised yet' });
      } else {
        cells.push({
          row: row.title,
          column,
          value: 1 - cell.accuracy,
          detail: `${cell.correct}/${cell.attempts} correct`,
        });
      }
    });
  }
  return cells;
}

/** The "Where it still slips" card: the Form × Word-type miss-rate matrix,
 *  separate for adjectives and verbs, plus the nine godan-ending triggers
 *  as a third, single-row matrix. Owns which cell is `selected` across all
 *  three — they share one readout line below them, so they stay together
 *  in one component, same split as before #33. Encodes the **miss rate**,
 *  not the hit rate (see CLAUDE.md's Stats section), and "never practised"
 *  is `sumi-matrix-heatmap`'s own "no data" state (a `value: null` cell),
 *  not the lightest ramp step. */
@Component({
  selector: 'app-miss-rate-heatmap',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Block: `.card` is a top-level section in normal flow, like its siblings.
  host: { style: 'display: block' },
  imports: [SumiCard, ...SUMI_CHARTS],
  templateUrl: './miss-rate-heatmap.component.html',
  styleUrl: './miss-rate-heatmap.component.css',
})
export class MissRateHeatmapComponent {
  readonly items = input<ItemStat[]>([]);

  readonly selected = signal<Selection | null>(null);
  protected readonly toPercent = toPercent;

  readonly matrices = computed<Matrix[]>(() => {
    const items = this.items();
    const blocks: { id: MatrixId; title: string; types: string[] }[] = [
      { id: 'adjectives', title: 'Adjectives', types: ADJECTIVE_TYPES },
      { id: 'verbs', title: 'Verbs', types: VERB_TYPES },
    ];
    const out: Matrix[] = [];
    for (const block of blocks) {
      const prefix = block.title + '__';
      const rows = rowsFor(items, prefix, block.types);
      if (!rows.length) {
        continue;
      }
      const columns = block.types.map((type) => wordTypeLabel(type));
      const columnTitles: Record<string, string> = {};
      block.types.forEach((type, i) => (columnTitles[columns[i]] = wordTypeTitle(type)));
      out.push({
        id: block.id,
        title: block.title,
        ariaLabel: `${block.title} conjugation miss rate, by form and word type`,
        rows: rows.map((r) => r.title),
        columns,
        cells: missRateCells(rows, columns),
        columnTitles,
      });
    }

    const triggers = triggerCells(items);
    if (triggers.length) {
      out.push({
        id: 'godan',
        title: 'Godan endings',
        ariaLabel: 'Godan verb miss rate, by trigger kana',
        rows: [GODAN_ROW],
        columns: triggers.map((t) => t.label),
        cells: missRateCells([{ title: GODAN_ROW, cells: triggers }], triggers.map((t) => t.label)),
        columnTitles: {},
      });
    }

    return out;
  });

  protected selectedCellFor(matrix: MatrixId): { row: string; column: string } | null {
    const selected = this.selected();
    if (!selected || selected.matrix !== matrix) {
      return null;
    }
    return { row: selected.row, column: selected.column };
  }

  protected onSelect(matrix: Matrix, selection: SumiMatrixCellSelection): void {
    const label =
      matrix.id === 'godan'
        ? `Godan ${selection.column}`
        : `${selection.row} · ${matrix.columnTitles[selection.column] ?? selection.column}`;
    this.selected.set({
      matrix: matrix.id,
      row: selection.row,
      column: selection.column,
      value: selection.value,
      detail: selection.detail,
      label,
    });
  }

}
