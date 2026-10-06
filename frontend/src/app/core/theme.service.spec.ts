import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeService } from './theme.service';

const THEME_KEY = 'conjugation-theme';

function create(): ThemeService {
  return TestBed.runInInjectionContext(() => new ThemeService());
}

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('defaults to system with no data-theme attribute when nothing is stored', () => {
    const service = create();

    expect(service.theme()).toBe('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('reads a stored theme at construction and applies it', () => {
    localStorage.setItem(THEME_KEY, 'dark');

    const service = create();

    expect(service.theme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('cycles system -> light -> dark -> system, updating icon/title and localStorage', () => {
    const service = create();

    expect(service.theme()).toBe('system');

    service.cycle();
    expect(service.theme()).toBe('light');
    expect(service.icon()).toBe('☀');
    expect(service.title()).toBe('Theme: light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem(THEME_KEY)).toBe('light');

    service.cycle();
    expect(service.theme()).toBe('dark');
    expect(service.icon()).toBe('☾');
    expect(service.title()).toBe('Theme: dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');

    service.cycle();
    expect(service.theme()).toBe('system');
    expect(service.icon()).toBe('◐');
    expect(service.title()).toBe('Theme: system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(localStorage.getItem(THEME_KEY)).toBe('system');
  });

  it('falls back to system when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    const service = create();

    expect(service.theme()).toBe('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);

    vi.restoreAllMocks();
  });

  it('does not throw when localStorage.setItem throws, and keeps the in-memory theme', () => {
    const service = create();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => service.cycle()).not.toThrow();
    expect(service.theme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    vi.restoreAllMocks();
  });
});
