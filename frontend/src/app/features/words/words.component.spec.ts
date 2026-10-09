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

  it('shows kanji over reading, the meaning as tooltip and the plain columns in sumi-data-table', async () => {
    const fixture = render();
    httpMock.expectOne((r) => r.url === '/api/words').flush(
      response({
        words: [{ ...response().words[0], rating: 1234.4, attempts: 5, correct: 3 }],
      }),
    );
    await fixture.whenStable();

    const cells = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('sumi-data-table tbody td'),
    ) as HTMLElement[];
    expect(cells.map((c) => c.textContent?.trim().replace(/\s+/g, ' '))).toEqual([
      '食べるたべる',
      'to eat',
      'N5',
      '1,234',
      '3/5',
    ]);
    expect(cells[0].querySelector('b')?.textContent).toBe('食べる');
    expect(cells[0].querySelector('i')?.textContent).toBe('たべる');
    expect(cells[1].querySelector('.meaning')?.getAttribute('title')).toBe('to eat');
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

  it('shows the error state when the backend is unreachable, and retrying tries again', async () => {
    const fixture = render();
    httpMock
      .expectOne((r) => r.url === '/api/words')
      .flush('nope', { status: 500, statusText: 'Error' });
    await fixture.whenStable();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('sumi-error-state')).toBeTruthy();

    (el.querySelector('[sumierroraction]') as HTMLButtonElement).click();
    httpMock.expectOne((r) => r.url === '/api/words').flush(response());
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('sumi-error-state')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('table')).toBeTruthy();
  });
});
