import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { RuleForm, RuleRow } from '../../../core/models';
import { FormGridComponent, highlightResult, orderForms } from './form-grid.component';

function exampleRow(kanji: string, resultKanji: string): RuleRow {
  return {
    word_type: 'ichidan_verb',
    trigger: '',
    exception: false,
    ending: '',
    replacement: '',
    example: {
      kanji,
      hiragana: kanji,
      english: '',
      result_kanji: resultKanji,
      result_hiragana: resultKanji,
    },
    transformations: [],
  };
}

function form(overrides: Partial<RuleForm> = {}): RuleForm {
  return {
    form_key: 'key',
    title: 'title',
    settings_title: 'settings title',
    politeness: null,
    polarity: 'affirmative',
    rules: [exampleRow('食べる', '食べる')],
    ...overrides,
  };
}

function fourFormGroup(): RuleForm[] {
  return [
    form({
      form_key: 'polite-negative',
      settings_title: 'Polite, negative',
      politeness: 'polite',
      polarity: 'negative',
      rules: [exampleRow('食べる', '食べませんでした')],
    }),
    form({
      form_key: 'casual-affirmative',
      settings_title: 'Casual, affirmative',
      politeness: 'casual',
      polarity: 'affirmative',
      rules: [exampleRow('食べる', '食べた')],
    }),
    form({
      form_key: 'polite-affirmative',
      settings_title: 'Polite, affirmative',
      politeness: 'polite',
      polarity: 'affirmative',
      rules: [exampleRow('食べる', '食べました')],
    }),
    form({
      form_key: 'casual-negative',
      settings_title: 'Casual, negative',
      politeness: 'casual',
      polarity: 'negative',
      rules: [exampleRow('食べる', '食べなかった')],
    }),
  ];
}

function twoFormGroup(): RuleForm[] {
  return [
    form({
      form_key: 'negative',
      settings_title: 'Negative',
      politeness: null,
      polarity: 'negative',
      rules: [exampleRow('食べる', '食べなくて')],
    }),
    form({
      form_key: 'affirmative',
      settings_title: 'Positive',
      politeness: null,
      polarity: 'affirmative',
      rules: [exampleRow('食べる', '食べて')],
    }),
  ];
}

function render(forms: RuleForm[], selected: RuleForm) {
  const fixture = TestBed.createComponent(FormGridComponent);
  fixture.componentRef.setInput('forms', forms);
  fixture.componentRef.setInput('selected', selected);
  fixture.detectChanges();
  return fixture;
}

describe('highlightResult', () => {
  it('no emphasis when the result equals the dictionary form', () => {
    expect(highlightResult('食べる', '食べる')).toEqual({ stem: '食べる', rest: '' });
  });

  it('stem = dictionary form when the result keeps it as a prefix', () => {
    expect(highlightResult('食べる', '食べるな')).toEqual({ stem: '食べる', rest: 'な' });
  });

  it('longest common prefix otherwise, capped at dict.length - 1', () => {
    expect(highlightResult('食べる', '食べませんでした')).toEqual({ stem: '食べ', rest: 'ませんでした' });
    expect(highlightResult('美味しい', '美味しくない')).toEqual({ stem: '美味し', rest: 'くない' });
  });

  it('keeps at least one character emphasised for a whole-word change', () => {
    expect(highlightResult('来る', '来ない')).toEqual({ stem: '来', rest: 'ない' });
  });
});

describe('orderForms', () => {
  it('orders a 4-form group rows casual -> polite, columns affirmative -> negative', () => {
    const ordered = orderForms(fourFormGroup());
    expect(ordered.map((f) => f.form_key)).toEqual([
      'casual-affirmative',
      'casual-negative',
      'polite-affirmative',
      'polite-negative',
    ]);
  });

  it('orders a 2-form group affirmative -> negative', () => {
    const ordered = orderForms(twoFormGroup());
    expect(ordered.map((f) => f.form_key)).toEqual(['affirmative', 'negative']);
  });
});

describe('FormGridComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('sets --chars to the longest result in the group, in code points', () => {
    const forms = fourFormGroup();
    const fixture = render(forms, forms[0]);
    const grid: HTMLElement = fixture.nativeElement.querySelector('.grid');
    // 食べませんでした has 8 code points, the longest of this group's results.
    expect(grid.style.getPropertyValue('--chars')).toBe('8');
  });

  it('falls back to 1 when no form in the group has any rules', () => {
    const forms = [form({ rules: [] }), form({ form_key: 'b', rules: [] })];
    const fixture = render(forms, forms[0]);
    const grid: HTMLElement = fixture.nativeElement.querySelector('.grid');
    expect(grid.style.getPropertyValue('--chars')).toBe('1');
  });

  it('shows only the label for a form with no rules', () => {
    const forms = [form({ rules: [] }), form({ form_key: 'b' })];
    const fixture = render(forms, forms[0]);
    const cells: HTMLButtonElement[] = fixture.nativeElement.querySelectorAll('.cell');
    expect(cells[0].querySelector('.jp')).toBeFalsy();
    expect(cells[1].querySelector('.jp')).toBeTruthy();
  });

  it('renders column heads only for a 4-form group', () => {
    const fourFixture = render(fourFormGroup(), fourFormGroup()[0]);
    expect(fourFixture.nativeElement.querySelectorAll('.col-head').length).toBe(2);

    const twoFixture = render(twoFormGroup(), twoFormGroup()[0]);
    expect(twoFixture.nativeElement.querySelectorAll('.col-head').length).toBe(0);
  });

  it('marks aria-checked and roving tabindex on the selected cell only', () => {
    const forms = orderForms(fourFormGroup());
    const fixture = render(forms, forms[1]);
    const cells: HTMLButtonElement[] = fixture.nativeElement.querySelectorAll('.cell');

    cells.forEach((cell, i) => {
      expect(cell.getAttribute('aria-checked')).toBe(i === 1 ? 'true' : 'false');
      expect(cell.tabIndex).toBe(i === 1 ? 0 : -1);
      expect(cell.getAttribute('aria-label')).toBe(forms[i].settings_title);
    });
  });

  it('always exposes the full settings_title as aria-label, even behind the short narrow label', () => {
    const forms = orderForms(fourFormGroup());
    const fixture = render(forms, forms[0]);
    const cell: HTMLButtonElement = fixture.nativeElement.querySelector('.cell');
    expect(cell.getAttribute('aria-label')).toBe('Casual, affirmative');
    expect(cell.querySelector('.label-narrow')?.textContent).toBe('Casual');
  });

  it('uses settings_title as the label for a 2-form group, at every width', () => {
    const forms = orderForms(twoFormGroup());
    const fixture = render(forms, forms[0]);
    const cell: HTMLButtonElement = fixture.nativeElement.querySelector('.cell');
    expect(cell.querySelector('.label-narrow')?.textContent).toBe('Positive');
    expect(cell.querySelector('.label-wide')?.textContent).toBe('Positive');
  });

  it('ArrowRight/ArrowLeft move and wrap, emitting the newly focused form', () => {
    const forms = orderForms(fourFormGroup());
    const fixture = render(forms, forms[0]);
    const cells: HTMLButtonElement[] = fixture.nativeElement.querySelectorAll('.cell');
    const emitted: RuleForm[] = [];
    fixture.componentInstance.select.subscribe((f: RuleForm) => emitted.push(f));

    cells[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(emitted.at(-1)?.form_key).toBe(forms[1].form_key);

    cells[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    expect(emitted.at(-1)?.form_key).toBe(forms[forms.length - 1].form_key);
  });

  it('Home/End jump to the first/last cell', () => {
    const forms = orderForms(fourFormGroup());
    const fixture = render(forms, forms[0]);
    const cells: HTMLButtonElement[] = fixture.nativeElement.querySelectorAll('.cell');
    const emitted: RuleForm[] = [];
    fixture.componentInstance.select.subscribe((f: RuleForm) => emitted.push(f));

    cells[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    expect(emitted.at(-1)?.form_key).toBe(forms[forms.length - 1].form_key);

    cells[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
    expect(emitted.at(-1)?.form_key).toBe(forms[0].form_key);
  });

  it('ArrowDown/ArrowUp move by the grid\'s current column count', () => {
    const forms = orderForms(fourFormGroup());
    const fixture = render(forms, forms[0]);
    const cells: HTMLButtonElement[] = fixture.nativeElement.querySelectorAll('.cell');
    const grid: HTMLElement = fixture.nativeElement.querySelector('.grid');
    const columns = getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).filter(Boolean).length || 2;
    const emitted: RuleForm[] = [];
    fixture.componentInstance.select.subscribe((f: RuleForm) => emitted.push(f));

    cells[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(emitted.at(-1)?.form_key).toBe(forms[columns % forms.length].form_key);
  });

  it('clicking a cell emits select with that form', () => {
    const forms = orderForms(fourFormGroup());
    const fixture = render(forms, forms[0]);
    const cells: HTMLButtonElement[] = fixture.nativeElement.querySelectorAll('.cell');
    const emitted: RuleForm[] = [];
    fixture.componentInstance.select.subscribe((f: RuleForm) => emitted.push(f));

    cells[2].click();
    expect(emitted.at(-1)?.form_key).toBe(forms[2].form_key);
  });
});
