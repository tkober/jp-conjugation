import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { WordsResponse } from '../../core/models';
import { WordsComponent } from './words.component';

function response(overrides: Partial<WordsResponse> = {}): WordsResponse {
  return {
    total: 1,
    limit: 50,
    offset: 0,
    words: [
      {
        id: 1,
        kanji: '食べる',
        hiragana: 'たべる',
        english: 'to eat',
        jlpt: 'n5',
        word_type: 'ichidan_verb',
        trigger: '-',
        rating: 1000,
        attempts: 0,
        correct: 0,
      },
    ],
    ...overrides,
  };
}

describe('WordsComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  function render() {
    const fixture = TestBed.createComponent(WordsComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders a row per word when there are results', async () => {
    const fixture = render();
    httpMock.expectOne((r) => r.url === '/api/words').flush(response());
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('table')).toBeTruthy();
    expect(el.querySelector('sumi-empty-state')).toBeFalsy();
    expect(el.textContent).toContain('食べる');
  });

  it('shows the empty state with its companion instead of the table when nothing matches', async () => {
    const fixture = render();
    httpMock.expectOne((r) => r.url === '/api/words').flush(response({ total: 0, words: [] }));
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('table')).toBeFalsy();
    const emptyState = el.querySelector('sumi-empty-state');
    expect(emptyState).toBeTruthy();
    expect(emptyState?.querySelector('sumi-companion')).toBeTruthy();
    expect(el.textContent).toContain('No matches');
  });
});
