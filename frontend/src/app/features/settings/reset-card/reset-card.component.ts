import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { ApiService } from '../../../core/api.service';

/** The "Reset progress" card. Unlike the other cards it does not touch
 *  `Settings` at all — a reset clears answers/ratings/streaks, not any
 *  setting — so it owns its `api.reset()` + `api.loadProfile()` calls
 *  directly instead of emitting an output the parent would only forward. */
@Component({
  selector: 'app-reset-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Block: owns a whole `.card` section in normal flow, like its siblings.
  host: { style: 'display: block' },
  imports: [],
  templateUrl: './reset-card.component.html',
  styleUrls: ['./reset-card.component.css', '../settings-shared.css'],
})
export class ResetCardComponent {
  private api = inject(ApiService);

  readonly resetStep = signal(0);

  doReset(): void {
    this.api.reset().subscribe(() => {
      this.resetStep.set(3);
      this.api.loadProfile().subscribe();
    });
  }
}
