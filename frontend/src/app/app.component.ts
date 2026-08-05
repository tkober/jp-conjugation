import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { ApiService } from './api.service';

type Theme = 'system' | 'light' | 'dark';

const THEME_KEY = 'conjugation-theme';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <header>
      <div class="bar">
        <h1>活用</h1>

        <div class="chips">
          @if (api.profile(); as profile) {
            <span class="chip" title="Level">
              <b>Lv {{ profile.level }}</b>
              <i>{{ profile.elo | number: '1.0-0' }}</i>
            </span>
            <span class="chip" title="Current streak">
              <b>{{ profile.current_streak }}</b>
              <i>streak</i>
            </span>
          }
          <button type="button" class="theme" (click)="cycleTheme()" [title]="themeTitle()">
            {{ themeIcon() }}
          </button>
        </div>
      </div>

      @if (api.profile(); as profile) {
        <div class="progress" [attr.aria-label]="'Progress to level ' + (profile.level + 1)">
          <span [style.width.%]="profile.level_progress * 100"></span>
        </div>
      }

      <nav>
        @for (tab of tabs; track tab.path) {
          <a [routerLink]="tab.path" routerLinkActive="active">{{ tab.label }}</a>
        }
      </nav>
    </header>

    <main>
      <router-outlet />
    </main>
  `,
  styles: `
    :host {
      display: block;
      max-width: 640px;
      margin: 0 auto;
      padding: 0 20px 32px;
    }

    header {
      position: sticky;
      top: 0;
      z-index: 1;
      background: var(--bg);
      padding-top: 14px;
    }

    .bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    h1 {
      margin: 0;
      font-size: 1.25rem;
      letter-spacing: 0.08em;
    }

    .chips {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .chip {
      display: inline-flex;
      align-items: baseline;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 999px;
      background: var(--surface);
      border: 1px solid var(--border);
      font-size: 0.8125rem;
      white-space: nowrap;
    }

    .chip i {
      font-style: normal;
      color: var(--text-muted);
    }

    .theme {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 999px;
      width: 32px;
      height: 32px;
      line-height: 1;
      color: var(--text);
    }

    .progress {
      margin-top: 10px;
      height: 3px;
      border-radius: 2px;
      background: var(--surface-sunken);
      overflow: hidden;
    }

    .progress span {
      display: block;
      height: 100%;
      background: var(--accent);
      transition: width 0.4s ease;
    }

    nav {
      display: flex;
      gap: 6px;
      margin-top: 12px;
      /* Allowed to wrap: a scaled-up system font must not widen the page. */
      flex-wrap: wrap;
    }

    nav a {
      padding: 6px 12px;
      border-radius: 999px;
      text-decoration: none;
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    nav a.active {
      background: var(--accent-soft);
      color: var(--accent);
      font-weight: 600;
    }

    @media (max-width: 430px) {
      :host {
        padding: 0 14px 24px;
      }

      nav a {
        padding: 6px 10px;
      }
    }
  `,
})
export class AppComponent {
  readonly api = inject(ApiService);

  readonly tabs = [
    { path: '/practice', label: 'Practice' },
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
