import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  QueryList,
  ViewChild,
  ViewChildren,
  computed,
  input,
  output,
} from '@angular/core';

import { RuleForm } from '../../../core/models';

/** The stem/ending split the cell renders: `stem` plain, `rest` emphasised.
 *  `food` 食べる → 食べませんでした splits as `{ stem: '食べ', rest: 'ませんでした' }`. */
export interface Highlighted {
  stem: string;
  rest: string;
}

/** Where a form's result diverges from the dictionary form, read off
 *  `rules[0].example` (`kanji` as the dictionary form, `result_kanji` as the
 *  conjugated result): equal strings get no emphasis, a result that keeps
 *  the whole dictionary form as a prefix (食べる → 食べるな) keeps it as the
 *  stem, and anything else falls back to the longest common prefix, capped
 *  one short of the full dictionary form so a whole-word change (来る →
 *  来ない) still shows at least one emphasised character. Counted in code
 *  points, not UTF-16 units — none of the characters here are outside the
 *  BMP, but the brief is explicit about it and `[...s]` costs nothing. */
export function highlightResult(dict: string, result: string): Highlighted {
  if (result === dict) {
    return { stem: result, rest: '' };
  }
  if (result.startsWith(dict)) {
    return { stem: dict, rest: result.slice(dict.length) };
  }

  const dictChars = [...dict];
  const resultChars = [...result];
  let common = 0;
  while (
    common < dictChars.length &&
    common < resultChars.length &&
    dictChars[common] === resultChars[common]
  ) {
    common++;
  }
  const stemLength = Math.min(common, dictChars.length - 1);
  return {
    stem: resultChars.slice(0, stemLength).join(''),
    rest: resultChars.slice(stemLength).join(''),
  };
}

function politenessWeight(politeness: 'casual' | 'polite' | null): number {
  return politeness === 'polite' ? 1 : 0;
}

function polarityWeight(polarity: 'affirmative' | 'negative'): number {
  return polarity === 'negative' ? 1 : 0;
}

/** Rows casual → polite, columns affirmative → negative — explicit, since the
 *  server does not guarantee that order (see `rules.py`'s `rules_catalog()`). */
export function orderForms(forms: readonly RuleForm[]): RuleForm[] {
  return [...forms].sort((a, b) => {
    const byPoliteness = politenessWeight(a.politeness) - politenessWeight(b.politeness);
    if (byPoliteness !== 0) {
      return byPoliteness;
    }
    return polarityWeight(a.polarity) - polarityWeight(b.polarity);
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * The form picker on the Rules page (#58): one cell per form, replacing
 * `sumi-segmented-control` there. A segment row never fit — four forms
 * scrolled and clipped their labels at 360px, two forms left an empty
 * stretched track next to them (see the issue). Every cell shows its label
 * and the result of the form's first rule row (`rules[0].example`), with the
 * part the form adds to the dictionary form emphasised (`highlightResult`).
 *
 * Layout switches between a 2×2 grid (narrow, with "Positive"/"Negative"
 * column heads above and a short "Casual"/"Polite" cell label) and 4 cells
 * in one row (wide, full `settings_title` label) by a **container query on
 * this component's own width**, not the viewport — `sumi-page width="narrow"`
 * is plenty wide on an actual desktop screen. A 2-form group (politeness
 * `null`, e.g. the te-form) is always one row, label `settings_title`
 * either way. Both label variants render always; CSS toggles which one
 * shows, so no JS media-query plumbing is needed.
 *
 * No line break, in the result or the label, is a hard requirement (#58):
 * the result gets `white-space: nowrap` and a font-size that shrinks with
 * the longest result in the group (`--chars`, computed here and set on the
 * grid — kana/kanji are each 1em wide, so the whole group shares one size);
 * the label gets `nowrap` + ellipsis as a safety net underneath that.
 *
 * Semantics/keyboard follow `sumi-segmented-control`'s radiogroup pattern
 * (role="radio" + aria-checked + roving tabindex), except Up/Down move by
 * the grid's current column count (read live via `getComputedStyle` at
 * keydown, since it changes with the container query) instead of always ±1.
 * Each radio's `aria-label` is always the full `settings_title`, regardless
 * of which label variant is visible, so a screen reader never loses the
 * polite/negative distinction a short "Casual"/"Polite" label would hide;
 * the column heads are `aria-hidden` (they repeat what the cell labels
 * already say in the narrow layout).
 */
@Component({
  selector: 'app-form-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // Named, not just typed: each `.cell` is itself an inline-size
    // container (for the `cqi` font-size below), which would otherwise be
    // the *nearer* container and make an unnamed `@container` query in
    // form-grid.component.css resolve against a cell's own (tiny) width
    // instead of this host's.
    style: 'display: block; container-type: inline-size; container-name: form-grid',
    '[class.four]': 'isFourForm()',
  },
  templateUrl: './form-grid.component.html',
  styleUrl: './form-grid.component.css',
})
export class FormGridComponent {
  readonly forms = input.required<RuleForm[]>();
  readonly selected = input.required<RuleForm>();
  readonly select = output<RuleForm>();

  @ViewChild('gridRef')
  private readonly gridRef?: ElementRef<HTMLDivElement>;

  @ViewChildren('cellRef')
  private readonly cellRefs?: QueryList<ElementRef<HTMLButtonElement>>;

  readonly orderedForms = computed(() => orderForms(this.forms()));
  readonly isFourForm = computed(() => this.orderedForms().length === 4);

  /** Max code-point length of every form's first result in the group — the
   *  shared font-size denominator (see the class doc comment). A form with
   *  no rules contributes nothing; falls back to 1 if none has any. */
  readonly charsCount = computed(() => {
    const lengths = this.orderedForms()
      .filter((form) => form.rules.length > 0)
      .map((form) => [...form.rules[0].example.result_kanji].length);
    return lengths.length ? Math.max(...lengths) : 1;
  });

  isSelected(form: RuleForm): boolean {
    return form.form_key === this.selected().form_key;
  }

  /** The narrow-layout label: just the politeness for a 4-form group
   *  ("Casual"/"Polite"), the full `settings_title` otherwise (2-form
   *  groups show the same text at every width). */
  narrowLabel(form: RuleForm): string {
    return form.politeness ? capitalize(form.politeness) : form.settings_title;
  }

  highlighted(form: RuleForm): Highlighted {
    if (form.rules.length === 0) {
      return { stem: '', rest: '' };
    }
    const example = form.rules[0].example;
    return highlightResult(example.kanji, example.result_kanji);
  }

  pick(form: RuleForm): void {
    this.select.emit(form);
  }

  onKeydown(event: KeyboardEvent, index: number): void {
    const forms = this.orderedForms();
    if (forms.length === 0) {
      return;
    }

    let nextIndex: number | undefined;
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (index + 1) % forms.length;
        break;
      case 'ArrowLeft':
        nextIndex = (index - 1 + forms.length) % forms.length;
        break;
      case 'ArrowDown': {
        const columns = this.columnCount();
        nextIndex = (index + columns) % forms.length;
        break;
      }
      case 'ArrowUp': {
        const columns = this.columnCount();
        nextIndex = (index - columns + forms.length) % forms.length;
        break;
      }
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = forms.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    this.select.emit(forms[nextIndex]);
    this.focusCell(nextIndex);
  }

  /** The grid's current column count, read live because it changes with the
   *  container query (2 at narrow, 4 at wide for a 4-form group; always 2
   *  for a 2-form group) — hardcoding it would drift from the CSS. */
  private columnCount(): number {
    const grid = this.gridRef?.nativeElement;
    if (!grid) {
      return 2;
    }
    const columns = getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).filter(Boolean);
    return columns.length || 2;
  }

  private focusCell(index: number): void {
    // `ViewChildren` order matches template order, i.e. `orderedForms()`'s
    // order, since both come from the same `@for` loop.
    this.cellRefs?.get(index)?.nativeElement.focus();
  }
}
