import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe, PercentPipe } from '@angular/common';

/** The four top-line KPI tiles: answered, accuracy, average time, best
 *  streak. Purely presentational, no state of its own. */
@Component({
  selector: 'app-kpi-tiles',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Block: `.tiles` is a top-level section in normal flow, like the cards
  // beside it — no transparency into a flex/grid context is needed here.
  host: { style: 'display: block' },
  imports: [DecimalPipe, PercentPipe],
  templateUrl: './kpi-tiles.component.html',
  styleUrl: './kpi-tiles.component.css',
})
export class KpiTilesComponent {
  readonly attempts = input<number>(0);
  readonly accuracy = input<number | null>(null);
  readonly avgTimeMs = input<number | null>(null);
  readonly bestStreak = input<number>(0);

  readonly avgSeconds = computed(() => {
    const ms = this.avgTimeMs();
    return ms === null ? null : ms / 1000;
  });
}
