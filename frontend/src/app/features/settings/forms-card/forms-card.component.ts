import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';

import { SumiCard } from 'sumi-ui/layout';
import { SumiToggle } from 'sumi-ui/forms';

import { Settings, SettingsUpdate } from '../../../core/models';

/** The "Forms" card: which forms can come up in practice, grouped by
 *  category and form group. `disabledForms` is a `linkedSignal` off the
 *  `settings` input — it resets to the server's view whenever the parent
 *  pushes fresh settings, but toggling flips it immediately (optimistic UI)
 *  without waiting for the save request to come back. */
@Component({
  selector: 'app-forms-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Block: owns a whole `.card` section in normal flow, like its siblings.
  host: { style: 'display: block' },
  imports: [SumiCard, SumiToggle],
  templateUrl: './forms-card.component.html',
  styleUrls: ['./forms-card.component.css', '../settings-shared.css'],
})
export class FormsCardComponent {
  readonly settings = input.required<Settings>();
  readonly save = output<SettingsUpdate>();

  readonly disabledForms = linkedSignal(() => new Set(this.settings().disabled_forms));

  readonly categories = computed(() => {
    const groups = this.settings().groups;
    return [...new Set(groups.map((g) => g.category))];
  });

  private readonly totalForms = computed(() =>
    this.settings().groups.reduce((n, g) => n + g.forms.length, 0),
  );

  readonly noFormsLeft = computed(() => {
    const total = this.totalForms();
    return total > 0 && this.disabledForms().size >= total;
  });

  groupsOf(category: string) {
    return this.settings().groups.filter((g) => g.category === category);
  }

  /** `toggleRef` is the clicked `sumi-toggle` itself: it has already
   *  flipped its own `value` signal by the time this runs (that's how the
   *  library's toggle works), so the guard below reverts it directly on
   *  the instance rather than through the `[value]` binding — a template
   *  binding that recomputes to the *same* boolean it already had (true,
   *  unchanged) is skipped by Angular as a no-op, which would otherwise
   *  leave the switch visually off even though nothing was disabled. */
  toggleForm(key: string, toggleRef: SumiToggle): void {
    const next = new Set(this.disabledForms());
    next.has(key) ? next.delete(key) : next.add(key);
    if (next.size >= this.totalForms()) {
      toggleRef.value.set(!this.disabledForms().has(key)); // revert — see doc comment above
      return; // the backend would reject it anyway — at least one form stays on
    }
    this.disabledForms.set(next);
    this.save.emit({ disabled_forms: [...next] });
  }
}
