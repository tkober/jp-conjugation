import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { ApiService } from './core/api.service';

type Theme = 'system' | 'light' | 'dark';

const THEME_KEY = 'conjugation-theme';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  readonly api = inject(ApiService);

  readonly tabs = [
    { path: '/practice', label: 'Practice' },
    { path: '/rules', label: 'Rules' },
    { path: '/stats', label: 'Stats' },
    { path: '/words', label: 'Words' },
    { path: '/settings', label: 'Settings' },
  ];

  private theme = signal<Theme>(readStoredTheme());

  constructor() {
    this.applyTheme(this.theme());
    this.api.loadProfile().subscribe({ error: () => undefined });
  }

  themeIcon(): string {
    return { system: '◐', light: '☀', dark: '☾' }[this.theme()];
  }

  themeTitle(): string {
    return `Theme: ${this.theme()}`;
  }

  cycleTheme(): void {
    const order: Theme[] = ['system', 'light', 'dark'];
    const next = order[(order.indexOf(this.theme()) + 1) % order.length];
    this.theme.set(next);
    localStorage.setItem(THEME_KEY, next);
    this.applyTheme(next);
  }

  private applyTheme(theme: Theme): void {
    const root = document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }
}

function readStoredTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}
