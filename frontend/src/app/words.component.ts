import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { ApiService } from './api.service';
import { WordsResponse } from './models';

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 250;

const WORD_TYPES = [
  { value: '', label: 'All' },
  { value: 'ichidan_verb', label: '一段' },
  { value: 'godan_verb', label: '五段' },
  { value: 'suru_verb', label: 'する' },
  { value: 'kuru_verb', label: '来る' },
  { value: 'i_adjective', label: 'い-Adj' },
  { value: 'na_adjective', label: 'な-Adj' },
];

const SORTS = [
  { value: 'rating', label: 'Hardest' },
  { value: 'jlpt', label: 'Level' },
  { value: 'kanji', label: 'A–Z' },
  { value: 'attempts', label: 'Most seen' },
];

@Component({
  selector: 'app-words',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  template: `
    <section class="card filters">
      <input
        type="search"
        placeholder="Search kanji, kana or meaning"
        [value]="query()"
        (input)="onSearch($any($event.target).value)"
      />

      <div class="row">
        <label>
          <span>Type</span>
          <select [value]="wordType()" (change)="setWordType($any($event.target).value)">
            @for (type of wordTypes; track type.value) {
              <option [value]="type.value">{{ type.label }}</option>
            }
          </select>
        </label>

        <label>
          <span>JLPT</span>
          <select [value]="jlpt()" (change)="setJlpt($any($event.target).value)">
            <option value="">All</option>
            @for (level of levels; track level) {
              <option [value]="level">{{ level.toUpperCase() }}</option>
            }
          </select>
        </label>

        <label>
          <span>Sort</span>
          <select [value]="sort()" (change)="setSort($any($event.target).value)">
            @for (option of sorts; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>
      </div>
    </section>

    @if (result(); as data) {
      <section class="card">
        <p class="count">
          {{ data.total | number }} words
          @if (data.total > pageSize) {
            <span class="muted">
              · showing {{ data.offset + 1 }}–{{ data.offset + data.words.length }}
            </span>
          }
        </p>

        <div class="grid-scroll">
          <table>
            <thead>
              <tr>
                <th>Word</th>
                <th>Meaning</th>
                <th class="num">JLPT</th>
                <th class="num">Rating</th>
                <th class="num">Seen</th>
              </tr>
            </thead>
            <tbody>
              @for (word of data.words; track word.id) {
                <tr>
                  <td>
                    <b>{{ word.kanji }}</b>
                    <i>{{ word.hiragana }}</i>
                  </td>
                  <td class="meaning" [title]="word.english">{{ word.english }}</td>
                  <td class="num muted">{{ word.jlpt.toUpperCase() }}</td>
                  <td class="num">{{ word.rating | number: '1.0-0' }}</td>
                  <td class="num muted">
                    {{ word.attempts ? word.correct + '/' + word.attempts : '—' }}
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="muted">Nothing matches that.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (data.total > pageSize) {
          <div class="pager">
            <button type="button" [disabled]="offset() === 0" (click)="page(-1)">Previous</button>
            <span class="muted">{{ pageNumber() }} / {{ pageCount() }}</span>
            <button type="button" [disabled]="!hasNext()" (click)="page(1)">Next</button>
          </div>
        }
      </section>
    } @else {
      <p class="loading">Loading…</p>
    }
  `,
  styles: `
    :host {
      display: block;
      padding-top: 24px;
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 16px;
      margin-bottom: 16px;
    }

    .filters input[type='search'] {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text);
      margin-bottom: 10px;
    }

    .row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .row label {
      flex: 1;
      min-width: 96px;
    }

    .row span {
      display: block;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 2px;
    }

    select {
      width: 100%;
      padding: 8px 10px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text);
      font: inherit;
    }

    .count {
      margin: 0 0 10px;
      font-size: 0.875rem;
    }

    /* Wide content scrolls inside its own box; the page never does. */
    .grid-scroll {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    th {
      text-align: left;
      font-weight: 500;
      font-size: 0.75rem;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
      padding: 4px 8px 4px 0;
      white-space: nowrap;
    }

    td {
      padding: 8px 8px 8px 0;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }

    td b {
      display: block;
      font-size: 1rem;
      font-weight: 600;
      white-space: nowrap;
    }

    td i {
      font-style: normal;
      color: var(--text-muted);
      font-size: 0.8125rem;
      white-space: nowrap;
    }

    .meaning {
      min-width: 160px;
      max-width: 260px;
      color: var(--text-muted);
    }

    .num {
      text-align: right;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
      padding-right: 0;
    }

    .muted {
      color: var(--text-muted);
    }

    .pager {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-top: 12px;
    }

    .pager button {
      padding: 8px 14px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text);
    }

    .pager button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .loading {
      color: var(--text-muted);
    }
  `,
})
export class WordsComponent {
  private api = inject(ApiService);

  readonly wordTypes = WORD_TYPES;
  readonly sorts = SORTS;
  readonly levels = ['n5', 'n4', 'n3', 'n2', 'n1'];
  readonly pageSize = PAGE_SIZE;

  readonly result = signal<WordsResponse | null>(null);
  readonly query = signal('');
  readonly wordType = signal('');
  readonly jlpt = signal('');
  readonly sort = signal('rating');
  readonly offset = signal(0);

  private searchTimer: ReturnType<typeof setTimeout> | undefined;

  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil((this.result()?.total ?? 0) / PAGE_SIZE)),
  );
  readonly pageNumber = computed(() => Math.floor(this.offset() / PAGE_SIZE) + 1);
  readonly hasNext = computed(() => this.pageNumber() < this.pageCount());

  constructor() {
    this.load();
  }

  onSearch(value: string): void {
    this.query.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.offset.set(0);
      this.load();
    }, SEARCH_DEBOUNCE_MS);
  }

  setWordType(value: string): void {
    this.wordType.set(value);
    this.offset.set(0);
    this.load();
  }

  setJlpt(value: string): void {
    this.jlpt.set(value);
    this.offset.set(0);
    this.load();
  }

  setSort(value: string): void {
    this.sort.set(value);
    this.offset.set(0);
    this.load();
  }

  page(direction: number): void {
    this.offset.update((current) => Math.max(0, current + direction * PAGE_SIZE));
    this.load();
  }

  private load(): void {
    this.api
      .words({
        word_type: this.wordType(),
        jlpt: this.jlpt(),
        q: this.query(),
        sort: this.sort(),
        limit: PAGE_SIZE,
        offset: this.offset(),
      })
      .subscribe((data) => this.result.set(data));
  }
}
