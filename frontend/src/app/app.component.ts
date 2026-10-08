import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SumiHotkeyHelp } from 'sumi-ui/core';
import { SUMI_LAYOUT, SumiAppShellBrand, SumiNavItem, SumiShell } from 'sumi-ui/layout';

import { ApiService } from './core/api.service';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [...SUMI_LAYOUT, SumiHotkeyHelp, RouterOutlet, DecimalPipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  readonly api = inject(ApiService);
  /** Hides the level/Elo/streak pill while a practice session's own
   *  `sumi-session-bar` occupies the header's focus-actions area (#32) —
   *  `sumi-app-shell` only hides its own nav/switcher in focus mode (see
   *  docs/concept.md#layout-und-mobil, "Oben stehen nur Fortschritt und
   *  Genauigkeit"), not content projected into `sumiShellActions`, and on a
   *  360–390px phone the two together overflow the header. */
  protected readonly shell = inject(SumiShell);

  protected readonly brand: SumiAppShellBrand = { glyph: '活', name: 'Conjugation Trainer' };

  protected readonly navItems: SumiNavItem[] = [
    { label: 'Practice', link: 'practice', icon: 'practice' },
    { label: 'Rules', link: 'rules', icon: 'rules' },
    { label: 'Stats', link: 'stats', icon: 'stats' },
    { label: 'Words', link: 'words', icon: 'dictionary' },
    { label: 'Settings', link: 'settings', icon: 'settings' },
  ];

  constructor() {
    this.api.loadProfile().subscribe({ error: () => undefined });
  }
}
