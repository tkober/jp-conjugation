import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { ApiService } from '../../core/api.service';
import { RuleGroup, RuleRow, RulesResponse } from '../../core/models';
import { wordTypeLabel, wordTypeTitle } from '../../shared/word-types';

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
  templateUrl: './rules.component.html',
  styleUrl: './rules.component.css',
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
