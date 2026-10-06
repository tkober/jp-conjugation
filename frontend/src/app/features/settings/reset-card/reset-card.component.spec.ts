import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ResetCardComponent } from './reset-card.component';

describe('ResetCardComponent', () => {
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
    const fixture = TestBed.createComponent(ResetCardComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('starts at step 0 with just the "Reset…" button', () => {
    const fixture = render();
    expect(fixture.nativeElement.querySelector('button').textContent.trim()).toBe('Reset…');
  });

  it('walks Reset… → warn → confirm → done, calling reset + loadProfile only on the final click', () => {
    const fixture = render();
    const el: HTMLElement = fixture.nativeElement;

    el.querySelector('button')!.dispatchEvent(new Event('click'));
    fixture.detectChanges();
    expect(el.querySelector('.warn')!.textContent).toContain('cannot be undone');

    (el.querySelector('button.destructive') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.warn')!.textContent).toContain('Really delete');

    (el.querySelector('button.destructive') as HTMLButtonElement).click();
    fixture.detectChanges();

    httpMock.expectOne('/api/reset').flush({ status: 'ok' });
    httpMock.expectOne('/api/profile').flush({
      elo: 1000,
      level: 1,
      level_progress: 0,
      current_streak: 0,
      best_streak: 0,
    });
    fixture.detectChanges();

    expect(el.querySelector('.done')!.textContent).toContain('Progress cleared.');
  });

  it('Cancel at either confirmation step goes back to step 0 without any request', () => {
    const fixture = render();
    const el: HTMLElement = fixture.nativeElement;

    el.querySelector('button')!.dispatchEvent(new Event('click'));
    fixture.detectChanges();
    (Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Cancel') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.querySelector('button')!.textContent!.trim()).toBe('Reset…');
  });
});
