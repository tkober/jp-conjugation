import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

import { SumiCard, SumiPage } from 'sumi-ui/layout';
import { SumiSegmentedControl, type SumiSegmentedOption } from 'sumi-ui/forms';

import { ApiService } from '../../core/api.service';
import { RuleForm, RuleGroup, RulesResponse } from '../../core/models';
import { RuleTableComponent, Section } from './rule-table/rule-table.component';

/** Shown when the URL names no form: the rule set with the most sound
 *  changes, and the one learners come back to most. */
const DEFAULT_FORM = 'Verbs__TeFormAffirmative';

@Component({
  selector: 'app-rules',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SumiPage, SumiCard, SumiSegmentedControl, RuleTableComponent],
  templateUrl: './rules.component.html',
  styleUrl: './rules.component.css',
})
export class RulesComponent {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

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

  /** Every group in this category, as segmented-control options. */
  groupOptions(category: { name: string; groups: RuleGroup[] }): SumiSegmentedOption<RuleGroup>[] {
    return category.groups.map((group) => ({ value: group, label: group.title }));
  }

  /** The selected group, but only if it belongs to this category — a
   *  segmented control otherwise has no way to show "nothing selected" per
   *  category while another category holds the real selection. */
  selectedGroupIn(category: { name: string; groups: RuleGroup[] }): RuleGroup | undefined {
    const group = this.selected()?.group;
    return group && category.groups.includes(group) ? group : undefined;
  }

  selectGroup(group: RuleGroup | undefined): void {
    if (group) {
      this.router.navigate(['/rules', group.forms[0].form_key], { replaceUrl: true });
    }
  }

  formOptions(group: RuleGroup): SumiSegmentedOption<RuleForm>[] {
    return group.forms.map((form) => ({ value: form, label: form.settings_title }));
  }

  selectForm(form: RuleForm): void {
    this.router.navigate(['/rules', form.form_key], { replaceUrl: true });
  }
}
