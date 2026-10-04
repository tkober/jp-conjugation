import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { ApiService } from './api.service';
import { RuleGroup, RuleRow, RulesResponse } from './models';
import { wordTypeLabel, wordTypeTitle } from './word-types';

/** Shown when the URL names no form: the rule set with the most sound
 *  changes, and the one learners come back to most. */
const DEFAULT_FORM = 'Verbs__TeFormAffirmative';

interface Section {
  wordType: string;
  rows: RuleRow[];
}

@Component({
  selector: 'app-rules',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    @if (data(); as data) {
      <section class="card picker">
        @for (category of categories(); track category.name) {
          <div class="category">
            <h2>{{ category.name }}</h2>
            <nav class="chips" [attr.aria-label]="category.name">
              @for (group of category.groups; track group.title) {
                <a
                  class="chip"
                  [class.active]="group === selected()?.group"
                  [routerLink]="['/rules', group.forms[0].form_key]"
                  replaceUrl
                  >{{ group.title }}</a
                >
              }
            </nav>
          </div>
        }
      </section>

      @if (selected(); as sel) {
        <section class="card explain">
          <p class="eyebrow">{{ sel.group.category }}</p>
          <h1>{{ sel.group.title }}</h1>
          <p class="summary">{{ sel.group.summary }}</p>
          <p class="build">{{ sel.group.build }}</p>

          <nav class="forms" aria-label="Form">
            @for (form of sel.group.forms; track form.form_key) {
              <a
                [class.active]="form === sel.form"
                [routerLink]="['/rules', form.form_key]"
                replaceUrl
                >{{ form.settings_title }}</a
              >
            }
          </nav>
        </section>

        <section class="card table">
          <h2 class="form-title">{{ sel.form.title }}</h2>

          @for (section of sections(); track section.wordType) {
            <h3>
              {{ typeTitle(section.wordType) }}
              <span class="type-label">{{ typeLabel(section.wordType) }}</span>
            </h3>

            <ul>
              @for (row of section.rows; track $index) {
                <li [class.exception]="row.exception">
                  <div class="pattern">
                    @switch (patternKind(row)) {
                      @case ('unchanged') {
                        <span class="muted">dictionary form</span>
                      }
                      @case ('append') {
                        <span class="op">+</span><b>{{ row.replacement }}</b>
                      }
                      @case ('drop') {
                        <span class="op">−</span><s>{{ row.ending }}</s>
                      }
                      @default {
                        <span class="tilde">{{ tilde(row) }}</span><s>{{ row.ending }}</s>
                        <span class="op">→</span>
                        <span class="tilde">{{ tilde(row) }}</span><b>{{ row.replacement }}</b>
                      }
                    }
                    @if (row.exception) {
                      <span class="badge">exception</span>
                    }
                  </div>

                  <div class="example">
                    <span class="word">
                      {{ row.example.kanji }} <span class="op">→</span>
                      <b>{{ row.example.result_kanji }}</b>
                    </span>
                    <span class="reading">
                      {{ row.example.hiragana }} → {{ row.example.result_hiragana }}
                      · {{ row.example.english }}
                    </span>
                  </div>

                  <!-- Only for composed forms: a single step says nothing the
                       pattern above does not already say. -->
                  @if (row.transformations.length > 1) {
                    <div class="rule">
                      @for (t of row.transformations; track $index; let last = $last) {
                        <span class="step">
                          <span class="unaltered">{{ t.unaltered }}</span
                          ><span class="altered">{{ t.altered_part }}</span>
                          <span class="operation">{{ t.operation }}</span>
                          @if (last) {
                            <span class="alteration">{{ t.alteration }}</span>
                          }
                        </span>
                      }
                    </div>
                  }
                </li>
              }
            </ul>
          }
        </section>
      }
    } @else if (failed()) {
      <p class="loading">Could not load the rules.</p>
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

    .category + .category {
      margin-top: 12px;
    }

    .category h2 {
      margin: 0 0 6px;
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .chip {
      padding: 5px 12px;
      border-radius: 999px;
      border: 1px solid var(--border);
      color: var(--text);
      text-decoration: none;
      font-size: 0.875rem;
    }

    .chip.active {
      background: var(--accent-soft);
      border-color: var(--accent);
      color: var(--accent);
      font-weight: 600;
    }

    .eyebrow {
      margin: 0;
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .explain h1 {
      margin: 2px 0 8px;
      font-size: 1.375rem;
    }

    .summary {
      margin: 0 0 8px;
    }

    .build {
      margin: 0;
      color: var(--text-muted);
      line-height: 1.55;
    }

    /* Segmented control: every form of the group in one row, wrapping on a
       narrow screen instead of widening the page. */
    .forms {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 14px;
      padding: 3px;
      border-radius: 12px;
      background: var(--surface-sunken);
    }

    .forms a {
      flex: 1 1 auto;
      text-align: center;
      padding: 6px 10px;
      border-radius: 9px;
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.875rem;
      white-space: nowrap;
    }

    .forms a.active {
      background: var(--surface);
      color: var(--text);
      font-weight: 600;
      box-shadow: var(--shadow);
    }

    .form-title {
      margin: 0 0 4px;
      font-size: 1.0625rem;
    }

    h3 {
      margin: 18px 0 4px;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .type-label {
      margin-left: 4px;
      font-weight: 400;
      color: var(--text-muted);
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    /* Pattern and example share a row while both fit; a long pattern
       (〜う → 〜いませんでした) pushes the example onto its own line. */
    li {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 2px 12px;
      padding: 8px 0;
      border-bottom: 1px solid var(--border);
    }

    li:last-child {
      border-bottom: none;
    }

    .pattern {
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      flex: 1 0 7rem;
      gap: 0 4px;
      font-size: 1.0625rem;
    }

    .tilde {
      color: var(--text-muted);
    }

    .pattern s {
      color: var(--text-muted);
    }

    .pattern b {
      color: var(--rule-accent);
    }

    .op {
      color: var(--text-muted);
    }

    .badge {
      align-self: center;
      margin-left: 4px;
      padding: 1px 8px;
      border-radius: 999px;
      border: 1px solid var(--accent);
      color: var(--accent);
      font-size: 0.6875rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .example {
      flex: 1 1 9rem;
    }

    .word {
      display: block;
    }

    .reading {
      display: block;
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .muted {
      color: var(--text-muted);
      font-size: 0.9375rem;
    }

    /* The derivation chain, styled like the one in the practice verdict. */
    .rule {
      flex-basis: 100%;
      margin-top: 2px;
      font-size: 0.9375rem;
      /* A long chain scrolls on its own; the page never does. */
      overflow-x: auto;
      white-space: nowrap;
    }

    .rule .altered {
      text-decoration: line-through;
      color: var(--text-muted);
    }

    .rule .operation {
      margin: 0 0.4rem;
      color: var(--text-muted);
    }

    .rule .unaltered,
    .rule .alteration {
      font-weight: 700;
      color: var(--rule-accent);
    }

    .loading {
      color: var(--text-muted);
    }
  `,
})
export class RulesComponent {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  readonly data = signal<RulesResponse | null>(null);
  readonly failed = signal(false);

  private formKey = toSignal(this.route.paramMap.pipe(map((p) => p.get('form'))), {
    initialValue: null,
  });

  /** Groups by category (Adjectives / Verbs), in the server's order. */
  readonly categories = computed(() => {
    const result: { name: string; groups: RuleGroup[] }[] = [];
    for (const group of this.data()?.groups ?? []) {
      let category = result.find((c) => c.name === group.category);
      if (!category) {
        category = { name: group.category, groups: [] };
        result.push(category);
      }
      category.groups.push(group);
    }
    return result;
  });

  /** The form the URL names, falling back to the default for an unknown key. */
  readonly selected = computed(() => {
    const groups = this.data()?.groups ?? [];
    const find = (key: string | null) => {
      for (const group of groups) {
        const form = group.forms.find((f) => f.form_key === key);
        if (form) {
          return { group, form };
        }
      }
      return null;
    };
    return find(this.formKey()) ?? find(DEFAULT_FORM);
  });

  /** The selected form's rows, one block per word type. */
  readonly sections = computed(() => {
    const result: Section[] = [];
    for (const row of this.selected()?.form.rules ?? []) {
      const last = result[result.length - 1];
      if (last?.wordType === row.word_type) {
        last.rows.push(row);
      } else {
        result.push({ wordType: row.word_type, rows: [row] });
      }
    }
    return result;
  });

  constructor() {
    this.api.rules().subscribe({
      next: (r) => this.data.set(r),
      error: () => this.failed.set(true),
    });
  }

  typeTitle(type: string): string {
    return wordTypeTitle(type);
  }

  typeLabel(type: string): string {
    return wordTypeLabel(type);
  }

  patternKind(row: RuleRow): 'unchanged' | 'append' | 'drop' | 'replace' {
    if (!row.ending) {
      return row.replacement ? 'append' : 'unchanged';
    }
    return row.replacement ? 'replace' : 'drop';
  }

  /** 〜 marks "the rest of the word stays" — not for whole-word rules
   *  like 来る → 来ない (くる → こない), where nothing stays. */
  tilde(row: RuleRow): string {
    return row.ending === row.example.hiragana ? '' : '〜';
  }
}
