import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { SUMI_CHARTS } from 'sumi-ui/charts';
import type { SumiTableColumn } from 'sumi-ui/charts';
import { SumiCard, SumiPage } from 'sumi-ui/layout';

import { ApiService } from '../../core/api.service';
import { Stats } from '../../core/models';
import { wordTypeTitle } from '../../shared/word-types';
import { MissRateHeatmapComponent } from './miss-rate-heatmap/miss-rate-heatmap.component';

const WEAKEST_COLUMNS: SumiTableColumn[] = [
  { key: 'rule', label: 'Rule' },
  { key: 'type', label: 'Type' },
  { key: 'correct', label: 'Correct', align: 'end' },
];

@Component({
  selector: 'app-stats',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, SumiPage, SumiCard, MissRateHeatmapComponent, ...SUMI_CHARTS],
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.css',
})
export class StatsComponent {
  private api = inject(ApiService);

  readonly stats = signal<Stats | null>(null);

  readonly accuracyLabel = computed(() => {
    const accuracy = this.stats()?.accuracy ?? null;
    return accuracy === null ? '—' : `${Math.round(accuracy * 100)}%`;
  });

  readonly avgTimeLabel = computed(() => {
    const ms = this.stats()?.avg_time_ms ?? null;
    return ms === null ? '—' : `${(ms / 1000).toFixed(1)} s`;
  });

  readonly eloValue = computed(() => Math.round(this.stats()?.elo ?? 0));

  /** The lowest/highest point of the Elo history — `sumi-sparkline` itself
   *  only shows the current value and delta, so this keeps the old page's
   *  explicit min/max scale readable without a second chart. */
  readonly eloRange = computed(() => {
    const history = this.stats()?.elo_history ?? [];
    if (history.length < 2) {
      return null;
    }
    return { min: Math.round(Math.min(...history)), max: Math.round(Math.max(...history)) };
  });

  /** Last minus first point of the Elo history, rounded to 1 decimal;
   *  `null` below 2 points (the sparkline itself does not render then, see
   *  `app.stats.component.html`). */
  readonly eloDelta = computed(() => {
    const history = this.stats()?.elo_history ?? [];
    if (history.length < 2) {
      return null;
    }
    return Math.round((history[history.length - 1] - history[0]) * 10) / 10;
  });

  readonly weakestColumns = WEAKEST_COLUMNS;

  readonly weakestRows = computed(() =>
    (this.stats()?.weakest_items ?? []).map((item) => ({
      rule: item.title,
      type: wordTypeTitle(item.word_type) + (item.trigger === '-' ? '' : ` · ${item.trigger}`),
      correct: `${item.correct}/${item.attempts}`,
    })),
  );

  constructor() {
    this.api.stats().subscribe((s) => this.stats.set(s));
  }

  typeTitle(type: string): string {
    return wordTypeTitle(type);
  }
}
