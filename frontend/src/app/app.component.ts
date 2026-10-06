import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ApiService } from './core/api.service';
import { HeaderComponent } from './layout/header/header.component';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HeaderComponent, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  readonly api = inject(ApiService);

  constructor() {
    this.api.loadProfile().subscribe({ error: () => undefined });
  }
}
