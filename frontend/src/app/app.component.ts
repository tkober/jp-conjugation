import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SumiHotkeyHelp } from 'sumi-ui/core';
import { SUMI_LAYOUT, SumiAppShellBrand, SumiNavItem } from 'sumi-ui/layout';

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
