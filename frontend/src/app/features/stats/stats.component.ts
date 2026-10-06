import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe, PercentPipe } from '@angular/common';

import { ApiService } from '../../core/api.service';
import { ItemStat, Stats } from '../../core/models';
import { TYPE_TITLES, wordTypeLabel, wordTypeTitle } from '../../shared/word-types';

/** A heatmap cell: one (form × word type) pair, or one godan ending. */
interface Cell {
  key: string;
  label: string;
  attempts: number;
  correct: number;
  /** 0..4 bucket of the miss rate, or -1 when never practised. */
  heat: number;
  accuracy: number | null;
}

interface HeatRow {
  formKey: string;
  title: string;
  cells: Cell[];
}

const VERB_TYPES = ['ichidan_verb', 'godan_verb', 'suru_verb', 'kuru_verb'];
const ADJECTIVE_TYPES = ['i_adjective', 'na_adjective'];

// Miss rate, so the cells that need work are the ones that stand out.
const HEAT_BOUNDS = [0.1, 0.25, 0.45, 0.7];
const HEAT_LABELS = ['≤10%', '10–25%', '25–45%', '45–70%', '>70%'];

function bucket(missRate: number): number {
  const index = HEAT_BOUNDS.findIndex((bound) => missRate <= bound);
  return index === -1 ? HEAT_BOUNDS.length : index;
}

@Component({
  selector: 'app-stats',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, PercentPipe],
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.css',
})
export class StatsComponent {
  private api = inject(ApiService);

  readonly stats = signal<Stats | null>(null);
  readonly selected = signal<Cell | null>(null);
  readonly heatLabels = HEAT_LABELS;

  constructor() {
    this.api.stats().subscribe((s) => this.stats.set(s));
  }

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
    const items = this.stats()?.items ?? [];
    return [
      { title: 'Adjectives', types: ADJECTIVE_TYPES, rows: this.rowsFor(items, 'Adjectives__', ADJECTIVE_TYPES) },
      { title: 'Verbs', types: VERB_TYPES, rows: this.rowsFor(items, 'Verbs__', VERB_TYPES) },
    ].filter((block) => block.rows.length > 0);
  });

  readonly triggers = computed(() => {
    const items = (this.stats()?.items ?? []).filter(
      (i) => i.word_type === 'godan_verb' && i.trigger !== '-',
    );
    const byTrigger = new Map<string, ItemStat[]>();
    for (const item of items) {
      byTrigger.set(item.trigger, [...(byTrigger.get(item.trigger) ?? []), item]);
    }
    return [...byTrigger.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'ja'))
      .map(([trigger, group]) => this.toCell(trigger, `Godan ${trigger}`, group));
  });

  readonly spark = computed(() => {
    const history = this.stats()?.elo_history ?? [];
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
  });

  private rowsFor(items: ItemStat[], prefix: string, types: string[]): HeatRow[] {
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
        this.toCell(
          `${formKey}-${type}`,
          `${title} · ${TYPE_TITLES[type] ?? type}`,
          items.filter((i) => i.form_key === formKey && i.word_type === type),
        ),
      ),
    }));
  }

  /** Sum a group of items (godan spreads over nine triggers) into one cell. */
  private toCell(key: string, label: string, group: ItemStat[]): Cell {
    const attempts = group.reduce((n, i) => n + i.attempts, 0);
    const correct = group.reduce((n, i) => n + i.correct, 0);
    if (!attempts) {
      return { key, label, attempts: 0, correct: 0, heat: -1, accuracy: null };
    }
    const accuracy = correct / attempts;
    return { key, label, attempts, correct, heat: bucket(1 - accuracy), accuracy };
  }
}
