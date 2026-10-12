import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  PracticeRoundComponent,
  RoundExercise,
  RoundResult,
} from './practice-round.component';

function makeExercise(overrides: Partial<RoundExercise> = {}): RoundExercise {
  return {
    kanji: '食べる',
    hiragana: 'たべる',
    english: 'to eat',
    instruction: [],
    instruction_style: 'text',
    word_type: 'ichidan_verb',
    trigger: '-',
    form_title: 'Te-form, affirmative',
    target_time_ms: 5000,
    ...overrides,
  };
}

function makeResult(overrides: Partial<RoundResult> = {}): RoundResult {
  return {
    correct: true,
    stem_correct: true,
    ending_correct: true,
    expected_kanji: '食べて',
    transformations: [{ unaltered: '食べ', altered_part: 'る', alteration: 'て', operation: '→' }],
    ...overrides,
  };
}

describe('PracticeRoundComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  function render(options: {
    exercise?: RoundExercise;
    result?: RoundResult | null;
    gaveUp?: boolean;
    showTimer?: boolean;
  } = {}) {
    const fixture = TestBed.createComponent(PracticeRoundComponent);
    fixture.componentRef.setInput('exercise', options.exercise ?? makeExercise());
    fixture.componentRef.setInput('result', options.result ?? null);
    fixture.componentRef.setInput('gaveUp', options.gaveUp ?? false);
    if (options.showTimer !== undefined) {
      fixture.componentRef.setInput('showTimer', options.showTimer);
    }
    fixture.detectChanges();
    return fixture;
  }

  function fieldInput(fixture: ReturnType<typeof render>): HTMLInputElement {
    return fixture.nativeElement.querySelector('sumi-answer-field input');
  }

  function pressEnter(element: HTMLElement) {
    element.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );
  }

  it('emits submitted with the typed (converted) answer and a measured time', () => {
    const fixture = render();
    const spy = vi.fn();
    fixture.componentInstance.submitted.subscribe(spy);

    const input = fieldInput(fixture);
    input.value = 'tabete';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    pressEnter(input);
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledTimes(1);
    const event = spy.mock.calls[0][0];
    expect(event.answer).toBe('たべて');
    expect(typeof event.timeMs).toBe('number');
  });

  it('ignores a second submit while the result is still pending', () => {
    const fixture = render();
    const spy = vi.fn();
    fixture.componentInstance.submitted.subscribe(spy);

    const input = fieldInput(fixture);
    input.value = 'tabete';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    pressEnter(input);
    fixture.detectChanges();

    // No result has arrived yet (the caller hasn't set [result] back), so
    // the field is still 'typing' — a second Enter must not emit again.
    pressEnter(fieldInput(fixture));
    fixture.detectChanges();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('renders the Elo line only when result.elo is present', () => {
    const fixture = render({ result: makeResult({ correct: true }) });
    expect(fixture.nativeElement.querySelector('.elo')).toBeFalsy();

    fixture.componentRef.setInput('result', makeResult({ correct: true, elo: { delta: 12.3 } }));
    fixture.detectChanges();

    const elo = fixture.nativeElement.querySelector('.elo');
    expect(elo).toBeTruthy();
    expect(elo.textContent).toContain('12.3');
  });

  it('hides the countdown ring (and the "Fast answer." message) when showTimer is false', () => {
    const fixture = render({
      showTimer: false,
      result: makeResult({ correct: true, fast: true }),
    });

    expect(fixture.nativeElement.querySelector('sumi-countdown-ring')).toBeFalsy();
    expect(fixture.nativeElement.textContent).not.toContain('Fast answer');
  });

  it('shows the countdown ring and the "Fast answer." message when showTimer is true (default)', () => {
    const fixture = render({ result: makeResult({ correct: true, fast: true }) });

    expect(fixture.nativeElement.querySelector('sumi-countdown-ring')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Fast answer');
  });
});
