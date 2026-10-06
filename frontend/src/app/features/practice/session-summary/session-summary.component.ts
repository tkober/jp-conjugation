import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';

/** The end-of-session card: answered/correct/accuracy/average time/Elo
 *  delta, and the button that starts the next session. */
@Component({
  selector: 'app-session-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Block, not the default inline a custom element gets: `.summary` is a
  // top-level `.card` in normal flow, like `.intro`/`.prompt` beside it.
  host: { style: 'display: block' },
  imports: [DecimalPipe],
  templateUrl: './session-summary.component.html',
  styleUrl: './session-summary.component.css',
})
export class SessionSummaryComponent {
  readonly answered = input<number>(0);
  readonly correct = input<number>(0);
  readonly totalTimeMs = input<number>(0);
  readonly eloDelta = input<number>(0);

  readonly restart = output<void>();

  readonly accuracy = computed(() =>
    this.answered() ? (this.correct() / this.answered()) * 100 : 0,
  );

  readonly averageSeconds = computed(() =>
    this.answered() ? this.totalTimeMs() / this.answered() / 1000 : 0,
  );
}
