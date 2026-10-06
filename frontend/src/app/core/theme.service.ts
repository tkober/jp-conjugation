import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

type Theme = 'system' | 'light' | 'dark';

const THEME_KEY = 'conjugation-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  private readonly themeSignal = signal<Theme>(readStoredTheme());
  readonly theme = this.themeSignal.asReadonly();

  readonly icon = computed(() => ({ system: '◐', light: '☀', dark: '☾' })[this.themeSignal()]);
  readonly title = computed(() => `Theme: ${this.themeSignal()}`);

  constructor() {
    this.applyTheme(this.themeSignal());
  }

  cycle(): void {
    const order: Theme[] = ['system', 'light', 'dark'];
    const next = order[(order.indexOf(this.themeSignal()) + 1) % order.length];
    this.themeSignal.set(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Private mode / blocked storage: skip persisting, keep the in-memory theme.
    }
    this.applyTheme(next);
  }

  private applyTheme(theme: Theme): void {
    const root = this.document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }
}

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}
