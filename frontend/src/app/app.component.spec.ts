import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideSumi } from 'sumi-ui/core';
import { SUMI_APP_DIRECTORY_WINDOW } from 'sumi-ui/layout';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AppComponent } from './app.component';

function createComponent() {
  const fixture = TestBed.createComponent(AppComponent);
  const httpMock = TestBed.inject(HttpTestingController);
  // The constructor always fires `loadProfile()` — answer it so it doesn't
  // leak into the next test as an unmatched request.
  httpMock.expectOne('/api/profile').flush({
    elo: 1234,
    level: 3,
    level_progress: 0.5,
    current_streak: 7,
    best_streak: 9,
  });
  fixture.detectChanges();
  return { fixture, httpMock };
}

describe('AppComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideSumi(),
        // Keep the app switcher off the network: there is no dashboard in tests.
        {
          provide: SUMI_APP_DIRECTORY_WINDOW,
          useValue: {
            location: {
              protocol: 'http:',
              hostname: 'localhost',
              origin: 'http://localhost',
              port: '',
            },
            localStorage: window.localStorage,
            fetch: () => Promise.reject(new Error('no dashboard in tests')),
          },
        },
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('renders the shell and the router outlet', async () => {
    const { fixture } = createComponent();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('sumi-app-shell')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
  });

  it('shows the five nav items with the right labels', async () => {
    const { fixture } = createComponent();
    await fixture.whenStable();

    const labels = Array.from(
      fixture.nativeElement.querySelectorAll('.sumi-app-shell__nav-link span'),
    ).map((el) => (el as Element).textContent?.trim());

    expect(labels).toEqual(['Practice', 'Rules', 'Stats', 'Words', 'Settings']);
  });

  it('shows the level, elo and streak from /api/profile', async () => {
    const { fixture } = createComponent();
    await fixture.whenStable();

    const badges = fixture.nativeElement.querySelectorAll('.profile-pill sumi-badge');
    expect(badges[0].textContent).toContain('Lv 3');
    expect(badges[0].textContent).toContain('1,234');
    expect(badges[1].textContent).toContain('7');
  });

  it('requests /api/profile exactly once on init', async () => {
    // createComponent's expectOne + the afterEach verify() together prove
    // there is exactly one request and nothing left unanswered.
    const { fixture } = createComponent();
    await fixture.whenStable();
  });
});
