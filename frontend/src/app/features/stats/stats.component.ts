import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { SUMI_CHARTS } from 'sumi-ui/charts';
import type { SumiTableColumn } from 'sumi-ui/charts';
import { SumiButtonDirective } from 'sumi-ui/forms';
import { SumiCard, SumiEmptyState, SumiErrorState, SumiPage } from 'sumi-ui/layout';

import { ApiService } from '../../core/api.service';
import { Stats } from '../../core/models';
import { wordTypeTitle } from '../../shared/word-types';
import { MissRateHeatmapComponent } from './miss-rate-heatmap/miss-rate-heatmap.component';

const WEAKEST_COLUMNS: SumiTableColumn[] = [
  { key: 'rule', label: 'Rule' },
  { key: 'type', label: 'Type' },
  { key: 'correct', label: 'Correct', align: 'end' },
];

/** `toneKey` covers both colourings `table.data` used to do by hand
 *  (right/wrong on the answer, up/down on the Elo delta) — no per-column
 *  cell template needed, since the tone alone (not extra markup) was the
 *  only thing a plain `<table>` had over `sumi-data-table` here. */
const RECENT_COLUMNS: SumiTableColumn[] = [
  { key: 'word', label: 'Word' },
  { key: 'rule', label: 'Rule' },
  { key: 'answer', label: 'Answer', toneKey: 'tone' },
  { key: 'elo', label: 'Elo', align: 'end', toneKey: 'eloTone' },
];

@Component({
  selector: 'app-stats',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    SumiPage,
    SumiCard,
    SumiEmptyState,
    SumiErrorState,
    SumiButtonDirective,
    MissRateHeatmapComponent,
    ...SUMI_CHARTS,
  ],
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.css',
})
export class StatsComponent {
  private api = inject(ApiService);

  readonly stats = signal<Stats | null>(null);
  readonly failed = signal(false);

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
  readonly recentColumns = RECENT_COLUMNS;

  readonly weakestRows = computed(() =>
    (this.stats()?.weakest_items ?? []).map((item) => ({
      rule: item.title,
      type: wordTypeTitle(item.word_type) + (item.trigger === '-' ? '' : ` · ${item.trigger}`),
      correct: `${item.correct}/${item.attempts}`,
    })),
  );

  readonly recentRows = computed(() =>
    (this.stats()?.recent ?? []).map((attempt) => ({
      word: attempt.kanji,
      rule: attempt.title,
      answer: attempt.correct ? attempt.given : `${attempt.given} → ${attempt.expected}`,
      tone: attempt.correct ? 'correct' : 'wrong',
      elo: `${attempt.elo_delta > 0 ? '+' : ''}${attempt.elo_delta.toFixed(1)}`,
      eloTone: attempt.elo_delta > 0 ? 'correct' : attempt.elo_delta < 0 ? 'wrong' : undefined,
    })),
  );

  constructor() {
    this.load();
  }

  retry(): void {
    this.failed.set(false);
    this.load();
  }

  private load(): void {
    this.api.stats().subscribe({
      next: (s) => this.stats.set(s),
      error: () => this.failed.set(true),
    });
  }

  typeTitle(type: string): string {
    return wordTypeTitle(type);
  }
}
