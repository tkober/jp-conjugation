import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ApiService } from '../../core/api.service';
import { CramExercise, CramForm, CramResult } from '../../core/models';
import { CramComponent } from './cram.component';

const FORM_KEY = 'Verbs__TeFormAffirmative';

function makeForm(overrides: Partial<CramForm> = {}): CramForm {
  return {
    form_key: FORM_KEY,
    title: 'Te-form, positive',
    settings_title: 'Te-form, positive',
    category: 'Verbs',
    group: 'Te-form',
    word_count: 214,
    ...overrides,
  };
}

function makeExercise(overrides: Partial<CramExercise> = {}): CramExercise {
  return {
    practice_item_id: 1,
    word_id: 1,
    form_key: FORM_KEY,
    form_title: 'Te-form, positive',
    instruction: [],
    instruction_style: 'text',
    word_type: 'ichidan_verb',
    trigger: '-',
    kanji: '食べる',
    hiragana: 'たべる',
    english: 'to eat',
    jlpt: 'n5',
    ...overrides,
  };
}

function makeResult(overrides: Partial<CramResult> = {}): CramResult {
  return {
    correct: true,
    stem_correct: true,
    ending_correct: true,
    stem: 'たべ',
    ending: 'て',
    given: 'たべて',
    expected_kanji: '食べて',
    expected_hiragana: 'たべて',
    transformations: [
      { unaltered: '食べ', altered_part: 'る', alteration: 'て', operation: '→' },
    ],
    ...overrides,
  };
}

describe('CramComponent', () => {
  let httpMock: HttpTestingController;
  let paramMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  beforeEach(() => {
    paramMap$ = new BehaviorSubject(convertToParamMap({ form: FORM_KEY }));

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: paramMap$ } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  function render() {
    const fixture = TestBed.createComponent(CramComponent);
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

  /** Types anything and submits, flushing `/api/cram/answer` with `correct`. */
  function answer(
    fixture: ReturnType<typeof render>,
    mock: HttpTestingController,
    correct: boolean,
  ): void {
    const input = fieldInput(fixture);
    // Plain kana (not romaji) so the field treats it as finished rather
    // than an unfinished syllable ("incomplete") that Enter won't submit —
    // `makeResult`'s `correct` override is what actually drives the test,
    // not this string.
    input.value = 'ぬぬぬ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    pressEnter(input);
    fixture.detectChanges();
    mock.expectOne('/api/cram/answer').flush(makeResult({ correct }));
    fixture.detectChanges();
  }

  /** `Enter` on a settled verdict — requests the next exercise. */
  function goNext(fixture: ReturnType<typeof render>): void {
    pressEnter(fieldInput(fixture));
    fixture.detectChanges();
  }

  function badgeText(fixture: ReturnType<typeof render>): string | null | undefined {
    return fixture.nativeElement.querySelector('sumi-badge')?.textContent?.trim();
  }

  it('loads the form and shows the word count on the gate', () => {
    const fixture = render();
    httpMock.expectOne(`/api/cram/forms/${FORM_KEY}`).flush(makeForm({ word_count: 214 }));
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Cram: Te-form, positive');
    expect(el.textContent).toContain('214 words match your JLPT filter');
    expect(el.querySelector('sumi-session-gate button')).toBeTruthy();
  });

  it('hides the start action and shows a Settings link when no words match', () => {
    const fixture = render();
    httpMock.expectOne(`/api/cram/forms/${FORM_KEY}`).flush(makeForm({ word_count: 0 }));
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('No words match your JLPT filter');
    expect(el.querySelector('sumi-session-gate button')).toBeFalsy();
    expect(el.querySelector('a[href="/settings"]')).toBeTruthy();
  });

  it('shows the unknown-form state on a 404', () => {
    const fixture = render();
    httpMock
      .expectOne(`/api/cram/forms/${FORM_KEY}`)
      .flush('nope', { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Unknown form');
    expect(el.querySelector('sumi-session-gate')).toBeFalsy();
    expect(el.querySelector('a[href="/rules"]')).toBeTruthy();
  });

  it('shows the network error state on a non-404 failure, and retrying tries again', () => {
    const fixture = render();
    httpMock
      .expectOne(`/api/cram/forms/${FORM_KEY}`)
      .flush('nope', { status: 500, statusText: 'Error' });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain("Can't reach the server");

    (el.querySelector('[sumierroraction]') as HTMLButtonElement).click();
    httpMock.expectOne(`/api/cram/forms/${FORM_KEY}`).flush(makeForm());
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain("Can't reach the server");
  });

  it('starting a session calls cramNext with the form key and an empty recent_word_ids', () => {
    const fixture = render();
    httpMock.expectOne(`/api/cram/forms/${FORM_KEY}`).flush(makeForm());
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('sumi-session-gate button') as HTMLButtonElement).click();
    const req = httpMock.expectOne('/api/cram/next');
    expect(req.request.body).toEqual({ form_key: FORM_KEY, recent_word_ids: [] });
    req.flush(makeExercise({ word_id: 11 }));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('sumi-answer-field')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('sumi-badge')?.textContent).toContain('Cram · not scored');
    // No timer for cram.
    expect(fixture.nativeElement.querySelector('sumi-countdown-ring')).toBeFalsy();
  });

  it('accumulates served word ids into recent_word_ids on the next request', () => {
    const fixture = render();
    httpMock.expectOne(`/api/cram/forms/${FORM_KEY}`).flush(makeForm());
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('sumi-session-gate button') as HTMLButtonElement).click();
    httpMock.expectOne('/api/cram/next').flush(makeExercise({ word_id: 11 }));
    fixture.detectChanges();

    const input = fieldInput(fixture);
    input.value = 'tabete';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    pressEnter(input);
    fixture.detectChanges();

    httpMock.expectOne('/api/cram/answer').flush(makeResult());
    fixture.detectChanges();

    pressEnter(fieldInput(fixture));
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/cram/next');
    expect(req.request.body).toEqual({ form_key: FORM_KEY, recent_word_ids: [11] });
    req.flush(makeExercise({ word_id: 12, kanji: '飲む', hiragana: 'のむ' }));
  });

  it('answering calls cramAnswer and leaves the shared profile untouched', () => {
    const api = TestBed.inject(ApiService);
    api.profile.set({ elo: 1000, level: 3, level_progress: 0.4, current_streak: 1, best_streak: 2 });

    const fixture = render();
    httpMock.expectOne(`/api/cram/forms/${FORM_KEY}`).flush(makeForm());
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('sumi-session-gate button') as HTMLButtonElement).click();
    httpMock.expectOne('/api/cram/next').flush(makeExercise());
    fixture.detectChanges();

    const input = fieldInput(fixture);
    input.value = 'tabete';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    pressEnter(input);
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/cram/answer');
    req.flush(makeResult({ correct: true }));
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('sumi-verdict')).toBeTruthy();
    expect(el.textContent).toContain('Correct');
    expect(api.profile()).toEqual({
      elo: 1000,
      level: 3,
      level_progress: 0.4,
      current_streak: 1,
      best_streak: 2,
    });
  });

  it('ending the session shows the summary with no Elo delta', () => {
    const fixture = render();
    httpMock.expectOne(`/api/cram/forms/${FORM_KEY}`).flush(makeForm());
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('sumi-session-gate button') as HTMLButtonElement).click();
    httpMock.expectOne('/api/cram/next').flush(makeExercise());
    fixture.detectChanges();

    const input = fieldInput(fixture);
    input.value = 'tabete';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    pressEnter(input);
    httpMock.expectOne('/api/cram/answer').flush(makeResult({ correct: true }));
    fixture.detectChanges();

    fixture.componentInstance.end();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('sumi-session-summary')).toBeTruthy();
    expect(el.textContent).not.toContain('Elo');
    expect(el.querySelector('sumi-hanko')?.textContent).toContain('合');
  });

  it('ending an untouched session goes back to the gate, not to a summary', () => {
    const fixture = render();
    httpMock.expectOne(`/api/cram/forms/${FORM_KEY}`).flush(makeForm());
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('sumi-session-gate button') as HTMLButtonElement).click();
    httpMock.expectOne('/api/cram/next').flush(makeExercise());
    fixture.detectChanges();

    fixture.componentInstance.end();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('sumi-session-gate')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('sumi-session-summary')).toBeFalsy();
  });

  it('navigating to another form resets to that form\'s gate', () => {
    const fixture = render();
    httpMock.expectOne(`/api/cram/forms/${FORM_KEY}`).flush(makeForm());
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('sumi-session-gate button') as HTMLButtonElement).click();
    httpMock.expectOne('/api/cram/next').flush(makeExercise());
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('sumi-answer-field')).toBeTruthy();

    paramMap$.next(convertToParamMap({ form: 'Verbs__TeFormNegative' }));
    fixture.detectChanges();

    httpMock
      .expectOne('/api/cram/forms/Verbs__TeFormNegative')
      .flush(makeForm({ form_key: 'Verbs__TeFormNegative', title: 'Te-form, negative' }));
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('sumi-answer-field')).toBeFalsy();
    expect(el.textContent).toContain('Cram: Te-form, negative');
  });

  describe('retries (#49)', () => {
    function start(fixture: ReturnType<typeof render>): void {
      httpMock.expectOne(`/api/cram/forms/${FORM_KEY}`).flush(makeForm());
      fixture.detectChanges();
      (fixture.nativeElement.querySelector('sumi-session-gate button') as HTMLButtonElement).click();
    }

    it('reappears as request #5 with the same ids after a miss and 3 other exercises, with a Retry badge', () => {
      const fixture = render();
      start(fixture);
      httpMock.expectOne('/api/cram/next').flush(makeExercise({ practice_item_id: 1, word_id: 1 }));
      fixture.detectChanges();
      expect(badgeText(fixture)).toBe('Cram · not scored');

      // Request #1 (already served above) is missed.
      answer(fixture, httpMock, false);
      goNext(fixture);

      // Requests #2, #3, #4: ordinary exercises, not yet due.
      for (const id of [2, 3, 4]) {
        const req = httpMock.expectOne('/api/cram/next');
        expect(req.request.body.retry).toBeUndefined();
        req.flush(makeExercise({ practice_item_id: id, word_id: id }));
        fixture.detectChanges();
        expect(badgeText(fixture)).toBe('Cram · not scored');
        answer(fixture, httpMock, true);
        goNext(fixture);
      }

      // Request #5: the retry, carrying the original pair.
      const retryReq = httpMock.expectOne('/api/cram/next');
      expect(retryReq.request.body.retry).toEqual({ practice_item_id: 1, word_id: 1 });
      retryReq.flush(makeExercise({ practice_item_id: 1, word_id: 1 }));
      fixture.detectChanges();
      expect(badgeText(fixture)).toBe('Retry · not scored');
    });

    it('schedules a second retry after the retry is missed again, then drops it after a third miss', () => {
      const fixture = render();
      start(fixture);
      httpMock.expectOne('/api/cram/next').flush(makeExercise({ practice_item_id: 1, word_id: 1 }));
      fixture.detectChanges();

      answer(fixture, httpMock, false); // miss #1
      goNext(fixture);
      for (const id of [2, 3, 4]) {
        httpMock.expectOne('/api/cram/next').flush(makeExercise({ practice_item_id: id, word_id: id }));
        fixture.detectChanges();
        answer(fixture, httpMock, true);
        goNext(fixture);
      }

      // Request #5: retry 1 — missed again.
      httpMock.expectOne('/api/cram/next').flush(makeExercise({ practice_item_id: 1, word_id: 1 }));
      fixture.detectChanges();
      answer(fixture, httpMock, false); // miss #2
      goNext(fixture);

      // Requests #6, #7, #8: ordinary, not yet due.
      for (const id of [6, 7, 8]) {
        const req = httpMock.expectOne('/api/cram/next');
        expect(req.request.body.retry).toBeUndefined();
        req.flush(makeExercise({ practice_item_id: id, word_id: id }));
        fixture.detectChanges();
        answer(fixture, httpMock, true);
        goNext(fixture);
      }

      // Request #9: retry 2, same ids.
      const retry2 = httpMock.expectOne('/api/cram/next');
      expect(retry2.request.body.retry).toEqual({ practice_item_id: 1, word_id: 1 });
      retry2.flush(makeExercise({ practice_item_id: 1, word_id: 1 }));
      fixture.detectChanges();
      expect(badgeText(fixture)).toBe('Retry · not scored');
      answer(fixture, httpMock, false); // miss #3 — dropped for good
      goNext(fixture);

      // Requests #10, #11, #12: ordinary, and the pair never comes back.
      const trailing = [10, 11, 12];
      for (const id of trailing) {
        const req = httpMock.expectOne('/api/cram/next');
        expect(req.request.body.retry).toBeUndefined();
        req.flush(makeExercise({ practice_item_id: id, word_id: id }));
        fixture.detectChanges();
        answer(fixture, httpMock, true);
        if (id !== trailing[trailing.length - 1]) {
          goNext(fixture);
        }
      }
    });

    it('a correct retry is not requeued and never reappears', () => {
      const fixture = render();
      start(fixture);
      httpMock.expectOne('/api/cram/next').flush(makeExercise({ practice_item_id: 1, word_id: 1 }));
      fixture.detectChanges();

      answer(fixture, httpMock, false); // miss #1
      goNext(fixture);
      for (const id of [2, 3, 4]) {
        httpMock.expectOne('/api/cram/next').flush(makeExercise({ practice_item_id: id, word_id: id }));
        fixture.detectChanges();
        answer(fixture, httpMock, true);
        goNext(fixture);
      }

      const retryReq = httpMock.expectOne('/api/cram/next');
      expect(retryReq.request.body.retry).toEqual({ practice_item_id: 1, word_id: 1 });
      retryReq.flush(makeExercise({ practice_item_id: 1, word_id: 1 }));
      fixture.detectChanges();
      answer(fixture, httpMock, true); // correct retry — dropped
      goNext(fixture);

      const trailing = [6, 7, 8, 9, 10];
      for (const id of trailing) {
        const req = httpMock.expectOne('/api/cram/next');
        expect(req.request.body.retry).toBeUndefined();
        req.flush(makeExercise({ practice_item_id: id, word_id: id }));
        fixture.detectChanges();
        answer(fixture, httpMock, true);
        if (id !== trailing[trailing.length - 1]) {
          goNext(fixture);
        }
      }
    });

    it('counts answered/correct on first attempts only, and retried/retriedCorrect separately', () => {
      const fixture = render();
      start(fixture);
      httpMock.expectOne('/api/cram/next').flush(makeExercise({ practice_item_id: 1, word_id: 1 }));
      fixture.detectChanges();

      answer(fixture, httpMock, false); // first attempt, miss
      goNext(fixture);
      for (const id of [2, 3, 4]) {
        httpMock.expectOne('/api/cram/next').flush(makeExercise({ practice_item_id: id, word_id: id }));
        fixture.detectChanges();
        answer(fixture, httpMock, true); // first attempts, correct
        goNext(fixture);
      }

      httpMock.expectOne('/api/cram/next').flush(makeExercise({ practice_item_id: 1, word_id: 1 }));
      fixture.detectChanges();
      answer(fixture, httpMock, true); // the retry, correct

      const c = fixture.componentInstance;
      expect(c.answered()).toBe(4);
      expect(c.correct()).toBe(3);
      expect(c.retried()).toBe(1);
      expect(c.retriedCorrect()).toBe(1);
    });

    it('shows the "Retried" line on the ended screen only when there were retries', () => {
      const fixtureNoRetries = render();
      start(fixtureNoRetries);
      httpMock.expectOne('/api/cram/next').flush(makeExercise({ practice_item_id: 1, word_id: 1 }));
      fixtureNoRetries.detectChanges();
      answer(fixtureNoRetries, httpMock, true);
      fixtureNoRetries.componentInstance.end();
      fixtureNoRetries.detectChanges();
      expect(fixtureNoRetries.nativeElement.textContent).not.toContain('Retried');

      const fixture = render();
      start(fixture);
      httpMock.expectOne('/api/cram/next').flush(makeExercise({ practice_item_id: 1, word_id: 1 }));
      fixture.detectChanges();
      answer(fixture, httpMock, false);
      goNext(fixture);
      for (const id of [2, 3, 4]) {
        httpMock.expectOne('/api/cram/next').flush(makeExercise({ practice_item_id: id, word_id: id }));
        fixture.detectChanges();
        answer(fixture, httpMock, true);
        goNext(fixture);
      }
      httpMock.expectOne('/api/cram/next').flush(makeExercise({ practice_item_id: 1, word_id: 1 }));
      fixture.detectChanges();
      answer(fixture, httpMock, true);

      fixture.componentInstance.end();
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Retried 1 · 1 correct');
    });
  });
});
