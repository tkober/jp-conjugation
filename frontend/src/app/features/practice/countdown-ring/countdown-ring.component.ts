import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const RING_RADIUS = 19;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** The countdown ring next to the target-form chips: SVG, `stroke-dashoffset`,
 *  r=19 in a 44px box. Shows the remaining seconds in the middle, turns red
 *  for the last quarter and, past zero, counts *up* as "+x.x s" instead of
 *  stopping at 0 — overtime is still useful information. */
@Component({
  selector: 'app-countdown-ring',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // `display: contents`: the ring sits as a flex item inside the parent's
  // `.task` row, sized and positioned by the `<svg>` itself. A block host
  // would add an extra box the flex row never had, throwing off the gap.
  host: { style: 'display: contents' },
  templateUrl: './countdown-ring.component.html',
  styleUrl: './countdown-ring.component.css',
})
export class CountdownRingComponent {
  readonly elapsedMs = input<number>(0);
  readonly targetMs = input<number>(0);

  readonly radius = RING_RADIUS;
  readonly circumference = RING_CIRCUMFERENCE;

  readonly fractionLeft = computed(() => {
    const target = this.targetMs();
    if (target <= 0) {
      return 1;
    }
    return Math.max(0, Math.min(1, 1 - this.elapsedMs() / target));
  });

  readonly ringOffset = computed(() => this.circumference * (1 - this.fractionLeft()));

  readonly ringLabel = computed(() => {
    const left = this.targetMs() - this.elapsedMs();
    return left >= 0 ? String(Math.ceil(left / 1000)) : `+${(-left / 1000).toFixed(1)}`;
  });
}
