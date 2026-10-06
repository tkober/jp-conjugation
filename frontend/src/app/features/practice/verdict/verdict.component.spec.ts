import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { AnswerResult, Exercise } from '../../../core/models';
import { VerdictComponent } from './verdict.component';

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    elo: 1000,
    level: 3,
    level_progress: 0.4,
    current_streak: 1,
    best_streak: 2,
    practice_item_id: 1,
    word_id: 1,
    form_key: 'Verbs__TeFormAffirmative',
    form_title: 'Te-form, affirmative',
    instruction: [],
    instruction_style: 'text',
    word_type: 'ichidan_verb',
    trigger: '-',
    kanji: '食べる',
    hiragana: 'たべる',
    english: 'to eat',
    jlpt: 'n5',
    target_time_ms: 5000,
    ...overrides,
  };
}

function makeResult(overrides: Partial<AnswerResult> = {}): AnswerResult {
  return {
    correct: true,
    stem_correct: true,
    ending_correct: true,
    fast: false,
    target_time_ms: 5000,
    stem: 'たべ',
    ending: 'て',
    given: 'たべて',
    expected_kanji: '食べて',
    expected_hiragana: 'たべて',
    transformations: [],
    elo: { before: 1000, after: 1010, delta: 10 },
    user_level: 3,
    level_progress: 0.4,
    streak: 2,
    best_streak: 2,
    ...overrides,
  };
}

function render(result: AnswerResult, exercise: Exercise) {
  const fixture = TestBed.createComponent(VerdictComponent);
  fixture.componentRef.setInput('result', result);
  fixture.componentRef.setInput('exercise', exercise);
  fixture.detectChanges();
  return fixture;
}

describe('VerdictComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('renders the correct headline, grammar line (incl. godan trigger), no solution', () => {
    const fixture = render(
      makeResult({ correct: true, fast: true }),
      makeExercise({ word_type: 'godan_verb', trigger: 'ぐ', form_title: 'Te-form, affirmative' }),
    );
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('.headline')?.textContent).toContain('正解');
    expect(el.querySelector('.headline i')?.textContent).toBe('fast');
    expect(el.querySelector('.grammar')?.textContent).toBe('Godan verb (ぐ) · Te-form, affirmative');
    expect(el.querySelector('.solution')).toBeNull();
    expect(el.querySelector('.card')?.classList.contains('ok')).toBe(true);
  });

  it('renders the wrong headline, grammar line, solution ruby and no partial when both halves miss', () => {
    const fixture = render(
      makeResult({ correct: false, stem_correct: false, ending_correct: false }),
      makeExercise({ word_type: 'ichidan_verb' }),
    );
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('.headline')?.textContent?.trim()).toBe('不正解');
    expect(el.querySelector('.grammar')?.textContent).toBe('Ichidan verb · Te-form, affirmative');
    const ruby = el.querySelector('.solution ruby');
    expect(ruby).toBeTruthy();
    expect(el.querySelector('.card')?.classList.contains('ok')).toBe(false);
    expect(el.querySelector('.partial')).toBeNull();
  });

  it('shows the "ending right, stem wrong" partial message', () => {
    const fixture = render(
      makeResult({ correct: false, stem_correct: false, ending_correct: true }),
      makeExercise(),
    );
    expect(fixture.nativeElement.querySelector('.partial')?.textContent).toBe(
      'Right conjugation — the word itself was misread.',
    );
  });

  it('shows the "stem right, ending wrong" partial message', () => {
    const fixture = render(
      makeResult({ correct: false, stem_correct: true, ending_correct: false }),
      makeExercise(),
    );
    expect(fixture.nativeElement.querySelector('.partial')?.textContent).toBe(
      'Word read correctly — the form was wrong.',
    );
  });

  it('renders the derivation chain when transformations are present', () => {
    const fixture = render(
      makeResult({
        correct: false,
        transformations: [
          { unaltered: '食べ', altered_part: 'る', alteration: 'て', operation: '→' },
        ],
      }),
      makeExercise(),
    );
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.rule')).toBeTruthy();
    expect(el.querySelector('.rule .unaltered')?.textContent).toBe('食べ');
    expect(el.querySelector('.rule .alteration')?.textContent).toBe('て');
  });

  it('encodes the jisho href from kanji + hiragana', () => {
    const fixture = render(makeResult(), makeExercise({ kanji: '食べる', hiragana: 'たべる' }));
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('.jisho');
    expect(link.getAttribute('href')).toBe(
      `https://jisho.org/search/${encodeURIComponent('食べる たべる')}`,
    );
  });

  it('prevents default on mousedown on the jisho link, keeping focus in the input', () => {
    const fixture = render(makeResult(), makeExercise());
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('.jisho');
    const event = new MouseEvent('mousedown', { cancelable: true });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('shows the signed Elo delta with up/down class', () => {
    const up = render(makeResult({ elo: { before: 1000, after: 1010, delta: 10 } }), makeExercise());
    const upEl: HTMLElement = up.nativeElement.querySelector('.elo');
    expect(upEl.textContent?.trim()).toContain('+10');
    expect(upEl.classList.contains('up')).toBe(true);

    const down = render(
      makeResult({ elo: { before: 1000, after: 990, delta: -10 } }),
      makeExercise(),
    );
    const downEl: HTMLElement = down.nativeElement.querySelector('.elo');
    expect(downEl.classList.contains('down')).toBe(true);
  });
});
