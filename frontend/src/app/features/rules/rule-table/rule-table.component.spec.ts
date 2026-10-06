import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { RuleRow } from '../../../core/models';
import { RuleTableComponent, Section } from './rule-table.component';

function row(overrides: Partial<RuleRow> = {}): RuleRow {
  return {
    word_type: 'godan_verb',
    trigger: 'う',
    exception: false,
    ending: '',
    replacement: '',
    example: {
      kanji: '買う',
      hiragana: 'かう',
      english: 'to buy',
      result_kanji: '買う',
      result_hiragana: 'かう',
    },
    transformations: [],
    ...overrides,
  };
}

function render(sections: Section[], formTitle = 'Non-past, affirmative') {
  const fixture = TestBed.createComponent(RuleTableComponent);
  fixture.componentRef.setInput('formTitle', formTitle);
  fixture.componentRef.setInput('sections', sections);
  fixture.detectChanges();
  return fixture;
}

describe('RuleTableComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('renders the form title', () => {
    const fixture = render([]);
    expect(fixture.nativeElement.querySelector('.form-title').textContent.trim()).toBe(
      'Non-past, affirmative',
    );
  });

  it('patternKind: unchanged when ending and replacement are both empty', () => {
    const fixture = render([{ wordType: 'godan_verb', rows: [row()] }]);
    expect(fixture.nativeElement.querySelector('.muted').textContent).toBe('dictionary form');
  });

  it('patternKind: append when only replacement is set (empty ending)', () => {
    const fixture = render([{ wordType: 'i_adjective', rows: [row({ ending: '', replacement: 'です' })] }]);
    const pattern = fixture.nativeElement.querySelector('.pattern');
    expect(pattern.querySelector('.op').textContent).toBe('+');
    expect(pattern.querySelector('b').textContent).toBe('です');
  });

  it('patternKind: drop when only ending is set (empty replacement)', () => {
    const fixture = render([{ wordType: 'i_adjective', rows: [row({ ending: 'い', replacement: '' })] }]);
    const pattern = fixture.nativeElement.querySelector('.pattern');
    expect(pattern.querySelector('.op').textContent).toBe('−');
    expect(pattern.querySelector('s').textContent).toBe('い');
  });

  it('patternKind: replace when both ending and replacement are set, with tilde', () => {
    const fixture = render([
      {
        wordType: 'godan_verb',
        rows: [
          row({
            ending: 'う',
            replacement: 'わない',
            example: {
              kanji: '買う',
              hiragana: 'かう',
              english: 'to buy',
              result_kanji: '買わない',
              result_hiragana: 'かわない',
            },
          }),
        ],
      },
    ]);
    const pattern = fixture.nativeElement.querySelector('.pattern');
    const tildes = pattern.querySelectorAll('.tilde');
    expect(tildes[0].textContent).toBe('〜');
    expect(pattern.querySelector('s').textContent).toBe('う');
    expect(pattern.querySelector('b').textContent).toBe('わない');
  });

  it('tilde is empty for a whole-word rule (ending equals the whole example reading)', () => {
    const fixture = render([
      {
        wordType: 'kuru_verb',
        rows: [
          row({
            ending: 'くる',
            replacement: 'こない',
            example: {
              kanji: '来る',
              hiragana: 'くる',
              english: 'to come',
              result_kanji: '来ない',
              result_hiragana: 'こない',
            },
          }),
        ],
      },
    ]);
    expect(fixture.nativeElement.querySelector('.pattern .tilde').textContent).toBe('');
  });

  it('shows the exception badge only for exception rows', () => {
    const fixture = render([{ wordType: 'godan_verb', rows: [row({ exception: true })] }]);
    expect(fixture.nativeElement.querySelector('.badge')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.badge').textContent.trim()).toBe('exception');
  });

  it('renders the derivation chain only when there is more than one transformation', () => {
    const single = render([{ wordType: 'ichidan_verb', rows: [row({ transformations: [{ unaltered: 'a', altered_part: 'b', alteration: 'c', operation: '→' }] })] }]);
    expect(single.nativeElement.querySelector('.rule')).toBeFalsy();

    const multi = render([
      {
        wordType: 'ichidan_verb',
        rows: [
          row({
            transformations: [
              { unaltered: 'a', altered_part: 'b', alteration: 'c', operation: '→' },
              { unaltered: 'd', altered_part: 'e', alteration: 'f', operation: '→' },
            ],
          }),
        ],
      },
    ]);
    expect(multi.nativeElement.querySelector('.rule')).toBeTruthy();
  });
});
