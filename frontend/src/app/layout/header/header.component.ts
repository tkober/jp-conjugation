import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { ThemeService } from '../../core/theme.service';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, RouterLink, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent {
  readonly api = inject(ApiService);
  readonly theme = inject(ThemeService);

  readonly tabs = [
    { path: '/practice', label: 'Practice' },
    { path: '/rules', label: 'Rules' },
    { path: '/stats', label: 'Stats' },
    { path: '/words', label: 'Words' },
    { path: '/settings', label: 'Settings' },
  ];
}
