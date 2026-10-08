import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AnswerResult, Exercise } from '../../core/models';
import { PracticeComponent } from './practice.component';

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
    transformations: [
      { unaltered: '食べ', altered_part: 'る', alteration: 'て', operation: '→' },
    ],
    elo: { before: 1000, after: 1010, delta: 10 },
    user_level: 3,
    level_progress: 0.4,
    streak: 2,
    best_streak: 2,
    ...overrides,
  };
}

describe('PracticeComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function render() {
    const fixture = TestBed.createComponent(PracticeComponent);
    fixture.detectChanges();
    return fixture;
  }

  /** Clicks the gate's "Start session" button and answers the resulting
   *  `/api/exercise/next` request. */
  function startSession(fixture: ReturnType<typeof render>, exercise = makeExercise()) {
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    httpMock.expectOne('/api/exercise/next').flush(exercise);
    fixture.detectChanges();
  }

  function fieldInput(fixture: ReturnType<typeof render>): HTMLInputElement {
    return fixture.nativeElement.querySelector('sumi-answer-field input');
  }

  function pressEnter(element: HTMLElement) {
    element.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );
  }

  it('starts idle, showing the session gate', () => {
    const fixture = render();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('sumi-session-gate')).toBeTruthy();
    expect(el.textContent).toContain('Ready to practice?');
  });

  it('starts a session from the gate and shows the prompt and the answer field', () => {
    const fixture = render();
    startSession(fixture);
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('sumi-answer-field')).toBeTruthy();
    expect(el.textContent).toContain('to eat');
    expect(el.querySelector('sumi-countdown-ring')).toBeTruthy();
  });

  it('submitting a typed answer sends it and shows the correct verdict', () => {
    const fixture = render();
    startSession(fixture);

    const input = fieldInput(fixture);
    input.value = 'tabete';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    pressEnter(input);
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/answer');
    expect(req.request.body.answer).toBe('たべて');
    expect(req.request.body.gave_up).toBe(false);
    req.flush(makeResult({ correct: true, fast: true }));
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('sumi-verdict')).toBeTruthy();
    expect(el.textContent).toContain('Correct');
    expect(el.textContent).toContain('Fast answer');
  });

  it('a wrong answer shows the expected solution and the derivation chain', () => {
    const fixture = render();
    startSession(fixture);

    const input = fieldInput(fixture);
    input.value = 'nomu';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    pressEnter(input);
    fixture.detectChanges();

    httpMock.expectOne('/api/answer').flush(
      makeResult({ correct: false, stem_correct: false, ending_correct: false, fast: false }),
    );
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Wrong');
    // Shown once, in the verdict's expected line — not repeated in the details.
    expect(el.textContent?.split('食べて').length).toBe(2);
    expect(el.querySelector('.rule')).toBeTruthy();
    expect(el.querySelector('.rule .unaltered')?.textContent).toBe('食べ');
  });

  it('Alt+H gives up: sends gave_up true, ignores the typed text and scores a miss', () => {
    const fixture = render();
    startSession(fixture);

    const input = fieldInput(fixture);
    input.value = 'tabete';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'h',
        code: 'KeyH',
        altKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/answer');
    expect(req.request.body.gave_up).toBe(true);
    expect(req.request.body.answer).toBe('');
    req.flush(
      makeResult({ correct: false, stem_correct: false, ending_correct: false, fast: false }),
    );
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Wrong');
    expect(el.textContent).toContain('Gave up');
  });

  it('Enter on a settled verdict requests the next exercise', () => {
    const fixture = render();
    startSession(fixture);

    const input = fieldInput(fixture);
    input.value = 'tabete';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    pressEnter(input);
    httpMock.expectOne('/api/answer').flush(makeResult({ correct: true }));
    fixture.detectChanges();

    pressEnter(fieldInput(fixture));
    fixture.detectChanges();

    httpMock.expectOne('/api/exercise/next').flush(makeExercise({ kanji: '飲む', hiragana: 'のむ' }));
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('飲');
  });

  it('ending the session shows the summary with answered/correct and the Elo delta', () => {
    const fixture = render();
    startSession(fixture);

    const input = fieldInput(fixture);
    input.value = 'tabete';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    pressEnter(input);
    httpMock.expectOne('/api/answer').flush(makeResult({ correct: true }));
    fixture.detectChanges();

    // sumi-session-bar's "End session" button lives in the shell header via
    // *sumiShellFocusActions, so it never renders inside this isolated
    // component test — calling end() exercises exactly what its (end)
    // output does.
    fixture.componentInstance.end();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('sumi-session-summary')).toBeTruthy();
    expect(el.textContent).toContain('Session complete');
  });

  it('ending an untouched session goes back to idle, not to a summary', () => {
    const fixture = render();

    fixture.componentInstance.end();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('sumi-session-gate')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('sumi-session-summary')).toBeFalsy();
  });
});
