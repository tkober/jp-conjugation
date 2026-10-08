import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ItemStat, Stats } from '../../core/models';
import { StatsComponent } from './stats.component';

function item(overrides: Partial<ItemStat> = {}): ItemStat {
  return {
    id: 1,
    form_key: 'Verbs__TeFormAffirmative',
    title: 'Te-form, positive',
    word_type: 'godan_verb',
    trigger: 'う',
    rating: 1000,
    attempts: 0,
    correct: 0,
    accuracy: null,
    last_served_at: null,
    ...overrides,
  };
}

function stats(overrides: Partial<Stats> = {}): Stats {
  return {
    elo: 1184,
    level: 3,
    level_progress: 0.4,
    current_streak: 2,
    best_streak: 9,
    attempts: 42,
    correct: 30,
    accuracy: 0.7142857142857143,
    avg_time_ms: 4200,
    missed_with_right_rule: 5,
    missed_with_right_reading: 4,
    elo_history: [1000, 1050, 1120, 1184],
    items: [],
    weakest_items: [],
    recent: [],
    ...overrides,
  };
}

function createComponent() {
  const fixture = TestBed.createComponent(StatsComponent);
  const httpMock = TestBed.inject(HttpTestingController);
  return { fixture, httpMock };
}

describe('StatsComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('renders the four KPI tiles with the right values', async () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    httpMock.expectOne('/api/stats').flush(stats());
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('42'); // Answered
    expect(text).toContain('71%'); // Accuracy, rounded
    expect(text).toContain('4.2 s'); // Ø time
    expect(text).toContain('9'); // Best streak
  });

  it('shows a dash for accuracy and Ø time when there is nothing to average', async () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    httpMock
      .expectOne('/api/stats')
      .flush(stats({ attempts: 0, correct: 0, accuracy: null, avg_time_ms: null, elo_history: [] }));
    await fixture.whenStable();

    const tiles = fixture.nativeElement.querySelectorAll('sumi-stat-tile');
    const values = Array.from(tiles).map((tile) => (tile as Element).textContent);
    expect(values.some((text) => text?.includes('—'))).toBe(true);
  });

  it('shows the empty-state card and no Elo/heatmap cards when nothing was practised', async () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    httpMock.expectOne('/api/stats').flush(stats({ attempts: 0, elo_history: [] }));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.card.empty')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('sumi-sparkline')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-miss-rate-heatmap')).toBeNull();
  });

  it('skips the sparkline with fewer than two Elo history points, but still shows the hint', async () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    httpMock.expectOne('/api/stats').flush(stats({ elo_history: [1184] }));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('sumi-sparkline')).toBeNull();
    expect((fixture.nativeElement.textContent as string)).toContain('currently 1,184, level 3');
  });

  it('names the Elo history range in the hint', async () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    httpMock.expectOne('/api/stats').flush(stats({ elo_history: [1000, 905, 1184] }));
    await fixture.whenStable();

    const range = fixture.nativeElement.querySelector('.hint .range');
    expect(range?.textContent?.trim()).toBe('Range 905–1184.');
  });

  it('renders the heatmap card once there is item data', async () => {
    const { fixture, httpMock } = createComponent();
    fixture.detectChanges();
    httpMock.expectOne('/api/stats').flush(
      stats({
        items: [item({ attempts: 10, correct: 7, accuracy: 0.7 })],
      }),
    );
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('app-miss-rate-heatmap')).toBeTruthy();
  });
});
