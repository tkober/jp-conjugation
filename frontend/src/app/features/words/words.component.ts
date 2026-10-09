import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { SumiDataTable, SumiTableCellTemplate, type SumiTableColumn, type SumiTableRow } from 'sumi-ui/charts';
import { SumiCard, SumiEmptyState, SumiErrorState, SumiPage } from 'sumi-ui/layout';
import { SumiButtonDirective, SumiInputDirective, SumiSelectDirective } from 'sumi-ui/forms';

import { ApiService } from '../../core/api.service';
import { WordsResponse } from '../../core/models';

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

const JLPT_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'n5', label: 'N5' },
  { value: 'n4', label: 'N4' },
  { value: 'n3', label: 'N3' },
  { value: 'n2', label: 'N2' },
  { value: 'n1', label: 'N1' },
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
  imports: [
    DecimalPipe,
    SumiPage,
    SumiCard,
    SumiEmptyState,
    SumiErrorState,
    SumiDataTable,
    SumiTableCellTemplate,
    SumiButtonDirective,
    SumiInputDirective,
    SumiSelectDirective,
  ],
  templateUrl: './words.component.html',
  styleUrl: './words.component.css',
})
export class WordsComponent {
  private api = inject(ApiService);

  readonly wordTypes = WORD_TYPES;
  readonly jlptOptions = JLPT_OPTIONS;
  readonly sorts = SORTS;
  readonly pageSize = PAGE_SIZE;

  readonly result = signal<WordsResponse | null>(null);
  readonly failed = signal(false);

  /** The word list as a sumi-data-table: kanji over reading and the
   *  meaning (truncated, full text as tooltip) are cell templates, the rest
   *  is plain text. */
  readonly wordColumns: SumiTableColumn[] = [
    { key: 'word', label: 'Word' },
    { key: 'english', label: 'Meaning' },
    { key: 'jlpt', label: 'JLPT', align: 'end' },
    { key: 'rating', label: 'Rating', align: 'end' },
    { key: 'seen', label: 'Seen', align: 'end' },
  ];

  readonly wordRows = computed<SumiTableRow[]>(() =>
    (this.result()?.words ?? []).map((word) => ({
      kanji: word.kanji,
      hiragana: word.hiragana,
      english: word.english,
      jlpt: word.jlpt.toUpperCase(),
      rating: Math.round(word.rating).toLocaleString('en-US'),
      seen: word.attempts ? `${word.correct}/${word.attempts}` : '—',
    })),
  );
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

  retry(): void {
    this.failed.set(false);
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
      .subscribe({
        next: (data) => {
          this.failed.set(false);
          this.result.set(data);
        },
        error: () => this.failed.set(true),
      });
  }
}
