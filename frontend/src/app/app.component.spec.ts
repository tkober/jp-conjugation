import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AppComponent } from './app.component';

function createComponent() {
  const fixture = TestBed.createComponent(AppComponent);
  const httpMock = TestBed.inject(HttpTestingController);
  // The constructor always fires `loadProfile()` — answer it so it doesn't
  // leak into the next test as an unmatched request.
  httpMock.expectOne('/api/profile').flush({
    elo: 1000,
    level: 1,
    level_progress: 0,
    current_streak: 0,
    best_streak: 0,
  });
  fixture.detectChanges();
  return { fixture, httpMock };
}

describe('AppComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('renders the header and the router outlet', async () => {
    const { fixture } = createComponent();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('app-header')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('main router-outlet')).toBeTruthy();
  });

  it('requests /api/profile exactly once on init', async () => {
    // createComponent's expectOne + the afterEach verify() together prove
    // there is exactly one request and nothing left unanswered.
    const { fixture } = createComponent();
    await fixture.whenStable();
  });
});
