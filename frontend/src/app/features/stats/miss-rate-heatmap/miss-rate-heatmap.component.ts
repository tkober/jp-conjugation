import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { PercentPipe } from '@angular/common';

import { ItemStat } from '../../../core/models';
import { wordTypeLabel, wordTypeTitle } from '../../../shared/word-types';
import { ADJECTIVE_TYPES, Cell, HEAT_LABELS, VERB_TYPES, rowsFor, triggerCells } from '../stats-math';

/** The "Where it still slips" card: the Form × Word-type heatmap, separate
 *  for adjectives and verbs, plus the nine godan-ending chips. Owns which
 *  cell is `selected` — the chips and the readout below share it, so they
 *  stay together in one component. Encodes the **miss rate**, not the hit
 *  rate (see the template comment by the heading), and treats "never
 *  practised" as its own dashed state rather than the lightest ramp step. */
@Component({
  selector: 'app-miss-rate-heatmap',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Block: `.card` is a top-level section in normal flow, like its siblings.
  host: { style: 'display: block' },
  imports: [PercentPipe],
  templateUrl: './miss-rate-heatmap.component.html',
  styleUrl: './miss-rate-heatmap.component.css',
})
export class MissRateHeatmapComponent {
  readonly items = input<ItemStat[]>([]);

  readonly selected = signal<Cell | null>(null);
  readonly heatLabels = HEAT_LABELS;

  typeLabel(type: string): string {
    return wordTypeLabel(type);
  }

  typeTitle(type: string): string {
    return wordTypeTitle(type);
  }

  cellTitle(rowTitle: string, cell: Cell): string {
    const where = `${rowTitle} · ${cell.label}`;
    return cell.attempts
      ? `${where}: ${cell.correct}/${cell.attempts} correct`
      : `${where}: not practised yet`;
  }

  readonly blocks = computed(() => {
    const items = this.items();
    return [
      { title: 'Adjectives', types: ADJECTIVE_TYPES, rows: rowsFor(items, 'Adjectives__', ADJECTIVE_TYPES) },
      { title: 'Verbs', types: VERB_TYPES, rows: rowsFor(items, 'Verbs__', VERB_TYPES) },
    ].filter((block) => block.rows.length > 0);
  });

  readonly triggers = computed(() => triggerCells(this.items()));
}
