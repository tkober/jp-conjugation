import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe, PercentPipe } from '@angular/common';

import { ApiService } from './api.service';
import { ItemStat, Stats } from './models';

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

const TYPE_LABELS: Record<string, string> = {
  ichidan_verb: '一段',
  godan_verb: '五段',
  suru_verb: 'する',
  kuru_verb: '来る',
  i_adjective: 'い',
  na_adjective: 'な',
};

const TYPE_TITLES: Record<string, string> = {
  ichidan_verb: 'Ichidan verb',
  godan_verb: 'Godan verb',
  suru_verb: 'Suru verb',
  kuru_verb: 'Kuru verb',
  i_adjective: 'I-adjective',
  na_adjective: 'Na-adjective',
};

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
  template: `
    @if (stats(); as s) {
      <section class="tiles">
        <div class="tile">
          <span>Answered</span>
          <b>{{ s.attempts }}</b>
        </div>
        <div class="tile">
          <span>Accuracy</span>
          <b>{{ s.accuracy === null ? '—' : (s.accuracy | percent: '1.0-0') }}</b>
        </div>
        <div class="tile">
          <span>Ø time</span>
          <b>{{ s.avg_time_ms === null ? '—' : (s.avg_time_ms / 1000 | number: '1.1-1') + ' s' }}</b>
        </div>
        <div class="tile">
          <span>Best streak</span>
          <b>{{ s.best_streak }}</b>
        </div>
      </section>

      @if (s.attempts === 0) {
        <section class="card empty">
          <p>Nothing practised yet. The numbers show up once you answer something.</p>
        </section>
      } @else {
        <section class="card">
          <h2>Elo</h2>
          <p class="hint">
            Your rating over the last {{ s.elo_history.length }} answers — currently
            {{ s.elo | number: '1.0-0' }}, level {{ s.level }}.
          </p>
          @if (spark(); as line) {
            <svg class="spark" [attr.viewBox]="'0 0 ' + line.width + ' ' + line.height"
                 preserveAspectRatio="none" role="img"
                 [attr.aria-label]="'Elo from ' + line.min + ' to ' + line.max">
              <polyline [attr.points]="line.points" />
            </svg>
            <div class="spark-scale">
              <span>{{ line.min }}</span>
              <span>{{ line.max }}</span>
            </div>
          }
        </section>

        <section class="card">
          <h2>Where it still slips</h2>
          <!-- Not "darker": the ramp is reversed in dark mode so that "more"
               always runs away from the background. "Stronger" holds either way. -->
          <p class="hint">
            Share of wrong answers per rule. The stronger the colour, the more
            misses — the faint cells are the ones that sit.
          </p>

          <div class="legend">
            <span class="legend-label">miss rate</span>
            @for (label of heatLabels; track label; let i = $index) {
              <span class="legend-step"><i [class]="'heat heat-' + i"></i>{{ label }}</span>
            }
            <span class="legend-step"><i class="heat heat-none"></i>unpractised</span>
          </div>

          @for (block of blocks(); track block.title) {
            <h3>{{ block.title }}</h3>
            <div class="grid-scroll">
              <table class="heat-table">
                <thead>
                  <tr>
                    <th class="corner"></th>
                    @for (type of block.types; track type) {
                      <th [title]="typeTitle(type)">{{ typeLabel(type) }}</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (row of block.rows; track row.formKey) {
                    <tr>
                      <th class="row-label" [title]="row.title">{{ row.title }}</th>
                      @for (cell of row.cells; track cell.key) {
                        <td>
                          <button
                            type="button"
                            [class]="'heat heat-' + (cell.heat < 0 ? 'none' : cell.heat)"
                            [title]="cellTitle(row.title, cell)"
                            (click)="selected.set(cell)"
                            (mouseenter)="selected.set(cell)"
                          ></button>
                        </td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          <h3>Godan endings</h3>
          <div class="chips">
            @for (cell of triggers(); track cell.key) {
              <button
                type="button"
                class="chip-cell"
                [title]="cellTitle('Godan ' + cell.label, cell)"
                (click)="selected.set(cell)"
                (mouseenter)="selected.set(cell)"
              >
                <i [class]="'heat heat-' + (cell.heat < 0 ? 'none' : cell.heat)"></i>
                {{ cell.label }}
              </button>
            }
          </div>

          <p class="readout">
            @if (selected(); as cell) {
              <b>{{ cell.label }}</b>
              @if (cell.attempts) {
                — {{ cell.correct }}/{{ cell.attempts }} correct
                ({{ (cell.accuracy ?? 0) | percent: '1.0-0' }})
              } @else {
                — not practised yet
              }
            } @else {
              Pick a cell to see its numbers.
            }
          </p>
        </section>

        @if (s.weakest_items.length) {
          <section class="card">
            <h2>Weakest rules</h2>
            <p class="hint">At least 3 answers each, worst first.</p>
            <table class="data">
              <thead>
                <tr><th>Rule</th><th>Type</th><th class="num">Correct</th></tr>
              </thead>
              <tbody>
                @for (item of s.weakest_items; track item.id) {
                  <tr>
                    <td>{{ item.title }}</td>
                    <td class="muted">
                      {{ typeTitle(item.word_type) }}{{ item.trigger === '-' ? '' : ' · ' + item.trigger }}
                    </td>
                    <td class="num">{{ item.correct }}/{{ item.attempts }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </section>
        }

        <section class="card">
          <h2>How the misses split</h2>
          <dl class="split">
            <div>
              <dt>Right rule, misread word</dt>
              <dd>{{ s.missed_with_right_rule }}</dd>
            </div>
            <div>
              <dt>Right reading, wrong form</dt>
              <dd>{{ s.missed_with_right_reading }}</dd>
            </div>
          </dl>
        </section>

        <section class="card">
          <h2>Recent</h2>
          <div class="grid-scroll">
            <table class="data">
              <thead>
                <tr><th>Word</th><th>Rule</th><th>Answer</th><th class="num">Elo</th></tr>
              </thead>
              <tbody>
                @for (attempt of s.recent; track attempt.created_at) {
                  <tr>
                    <td>{{ attempt.kanji }}</td>
                    <td class="muted">{{ attempt.title }}</td>
                    <td [class.ok]="attempt.correct" [class.bad]="!attempt.correct">
                      {{ attempt.correct ? attempt.given : attempt.given + ' → ' + attempt.expected }}
                    </td>
                    <td class="num" [class.ok]="attempt.elo_delta > 0" [class.bad]="attempt.elo_delta < 0">
                      {{ attempt.elo_delta > 0 ? '+' : '' }}{{ attempt.elo_delta | number: '1.0-1' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    } @else {
      <p class="loading">Loading…</p>
    }
  `,
  styles: `
    /* The heat ramp lives in styles.css, so light and dark swap in one place
       alongside the rest of the theme. */
    :host {
      display: block;
      padding-top: 24px;
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 20px;
      margin-bottom: 16px;
    }

    h2 {
      margin: 0 0 4px;
      font-size: 1.0625rem;
    }

    h3 {
      margin: 18px 0 8px;
      font-size: 0.8125rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
    }

    .hint {
      margin: 0 0 12px;
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .tiles {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 16px;
    }

    .tile {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 12px 14px;
    }

    .tile span {
      display: block;
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .tile b {
      font-size: 1.5rem;
    }

    .spark {
      width: 100%;
      height: 64px;
      display: block;
    }

    .spark polyline {
      fill: none;
      stroke: var(--spark);
      stroke-width: 2;
      stroke-linejoin: round;
      stroke-linecap: round;
      vector-effect: non-scaling-stroke;
    }

    .spark-scale {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }

    .legend {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 10px;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 4px;
    }

    .legend-label {
      font-weight: 600;
    }

    .legend-step {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .heat {
      display: block;
      width: 22px;
      height: 22px;
      border-radius: 4px;
      border: none;
      padding: 0;
    }

    .legend .heat {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }

    .heat-0 { background: var(--heat-0); }
    .heat-1 { background: var(--heat-1); }
    .heat-2 { background: var(--heat-2); }
    .heat-3 { background: var(--heat-3); }
    .heat-4 { background: var(--heat-4); }

    .heat-none {
      background: var(--surface-sunken);
      border: 1px dashed var(--border);
    }

    /* Wide content scrolls inside its own box; the page never does. */
    .grid-scroll {
      overflow-x: auto;
    }

    .heat-table {
      border-collapse: separate;
      /* 2px of surface between fills, so adjacent cells stay separate marks. */
      border-spacing: 2px;
    }

    .heat-table th {
      font-weight: 500;
      font-size: 0.75rem;
      color: var(--text-muted);
      text-align: left;
      white-space: nowrap;
    }

    /* Full rule names rather than ellipses — the table scrolls inside its own
       box if they don't fit, which is cheaper than making the reader guess. */
    .heat-table .row-label {
      padding-right: 6px;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .chip-cell {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px 4px 4px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text);
      font-size: 0.9375rem;
    }

    .chip-cell i {
      width: 16px;
      height: 16px;
      border-radius: 4px;
    }

    .readout {
      margin: 14px 0 0;
      font-size: 0.875rem;
      color: var(--text-muted);
      min-height: 1.5em;
    }

    .readout b {
      color: var(--text);
    }

    table.data {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    table.data th {
      text-align: left;
      font-weight: 500;
      color: var(--text-muted);
      font-size: 0.75rem;
      border-bottom: 1px solid var(--border);
      padding: 4px 8px 4px 0;
    }

    table.data td {
      padding: 6px 8px 6px 0;
      border-bottom: 1px solid var(--border);
      white-space: nowrap;
    }

    table.data .num {
      text-align: right;
      font-variant-numeric: tabular-nums;
      padding-right: 0;
    }

    .muted {
      color: var(--text-muted);
    }

    .ok {
      color: var(--correct);
    }

    .bad {
      color: var(--wrong);
    }

    .split {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin: 0;
    }

    .split dt {
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .split dd {
      margin: 2px 0 0;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .empty p,
    .loading {
      margin: 0;
      color: var(--text-muted);
    }
  `,
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
    return TYPE_LABELS[type] ?? type;
  }

  typeTitle(type: string): string {
    return TYPE_TITLES[type] ?? type;
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
