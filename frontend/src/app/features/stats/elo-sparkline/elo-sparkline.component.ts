import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { sparkline } from '../stats-math';

/** The Elo card: rating history, current rating and level, and the
 *  sparkline itself (SVG polyline + min/max scale). One series, so no
 *  legend is needed. */
@Component({
  selector: 'app-elo-sparkline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Block: `.card` is a top-level section in normal flow, like its siblings.
  host: { style: 'display: block' },
  imports: [DecimalPipe],
  templateUrl: './elo-sparkline.component.html',
  styleUrl: './elo-sparkline.component.css',
})
export class EloSparklineComponent {
  readonly history = input<number[]>([]);
  readonly elo = input<number>(0);
  readonly level = input<number>(0);

  readonly spark = computed(() => sparkline(this.history()));
}
