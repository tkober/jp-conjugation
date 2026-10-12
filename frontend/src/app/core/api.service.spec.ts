import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ApiService } from './api.service';
import { CramExercise, CramForm, CramResult, Profile } from './models';

function makeCramForm(overrides: Partial<CramForm> = {}): CramForm {
  return {
    form_key: 'Verbs__TeFormAffirmative',
    title: 'Te-form, positive',
    settings_title: 'Te-form, positive',
    category: 'Verbs',
    group: 'Te-form',
    word_count: 214,
    ...overrides,
  };
}

function makeCramExercise(overrides: Partial<CramExercise> = {}): CramExercise {
  return {
    practice_item_id: 1,
    word_id: 1,
    form_key: 'Verbs__TeFormAffirmative',
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

function makeCramResult(overrides: Partial<CramResult> = {}): CramResult {
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

/** `cramForm`/`cramNext`/`cramAnswer` must never refresh the shared
 *  `profile` signal — unlike `nextExercise`/`answer`/`stats`, which do that
 *  on every response (see `ApiService`). Cram is not scored, so there is
 *  nothing in any of its three responses that should ever reach the
 *  app-wide Elo/level/streak the header badges show. */
describe('ApiService cram calls', () => {
  let httpMock: HttpTestingController;
  let api: ApiService;
  const sentinelProfile: Profile = {
    elo: 1234,
    level: 5,
    level_progress: 0.6,
    current_streak: 3,
    best_streak: 9,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
    api = TestBed.inject(ApiService);
    api.profile.set(sentinelProfile);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('cramForm() leaves profile() untouched', () => {
    api.cramForm('Verbs__TeFormAffirmative').subscribe();
    httpMock.expectOne('/api/cram/forms/Verbs__TeFormAffirmative').flush(makeCramForm());

    expect(api.profile()).toEqual(sentinelProfile);
  });

  it('cramNext() posts the form key and recent word ids, and leaves profile() untouched', () => {
    api.cramNext('Verbs__TeFormAffirmative', [1, 2, 3]).subscribe();
    const req = httpMock.expectOne('/api/cram/next');
    expect(req.request.body).toEqual({
      form_key: 'Verbs__TeFormAffirmative',
      recent_word_ids: [1, 2, 3],
    });
    req.flush(makeCramExercise());

    expect(api.profile()).toEqual(sentinelProfile);
  });

  it('cramAnswer() leaves profile() untouched', () => {
    api
      .cramAnswer({ practice_item_id: 1, word_id: 1, answer: 'たべて', time_ms: 1000 })
      .subscribe();
    httpMock.expectOne('/api/cram/answer').flush(makeCramResult());

    expect(api.profile()).toEqual(sentinelProfile);
  });
});
