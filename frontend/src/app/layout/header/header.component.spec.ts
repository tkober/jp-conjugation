import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { HeaderComponent } from './header.component';

const THEME_KEY = 'conjugation-theme';

function createComponent() {
  const fixture = TestBed.createComponent(HeaderComponent);
  fixture.detectChanges();
  return { fixture };
}

describe('HeaderComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    TestBed.inject(HttpTestingController).verify();
  });

  it('renders all five tabs', async () => {
    const { fixture } = createComponent();
    await fixture.whenStable();

    const labels = Array.from(fixture.nativeElement.querySelectorAll('nav a')).map((a) =>
      (a as HTMLElement).textContent?.trim(),
    );
    expect(labels).toEqual(['Practice', 'Rules', 'Stats', 'Words', 'Settings']);
  });

  it('starts in system theme with no data-theme attribute and nothing stored', async () => {
    const { fixture } = createComponent();
    await fixture.whenStable();

    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
  });

  it('cycles system -> light -> dark -> system on each click, updating the DOM, localStorage, icon and title', async () => {
    const { fixture } = createComponent();
    await fixture.whenStable();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button.theme');

    button.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem(THEME_KEY)).toBe('light');
    expect(button.textContent?.trim()).toBe('☀');
    expect(button.title).toBe('Theme: light');

    button.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(button.textContent?.trim()).toBe('☾');
    expect(button.title).toBe('Theme: dark');

    button.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(localStorage.getItem(THEME_KEY)).toBe('system');
    expect(button.textContent?.trim()).toBe('◐');
    expect(button.title).toBe('Theme: system');
  });
});
