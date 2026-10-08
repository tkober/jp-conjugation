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

  /** Vetoes turning a form off when it is the last one still on — passed
   *  to `sumi-toggle`'s `[canChange]` (sumi-ui#36), which asks before
   *  writing anything, so there is nothing to revert on the control
   *  afterwards (see `SumiToggle`'s doc comment). */
  canDisable(key: string): (next: boolean) => boolean {
    return (next) => {
      if (next) {
        return true;
      }
      const stillOff = this.disabledForms().has(key)
        ? this.disabledForms().size
        : this.disabledForms().size + 1;
      return stillOff < this.totalForms();
    };
  }

  toggleForm(key: string, isOn: boolean): void {
    const next = new Set(this.disabledForms());
    isOn ? next.delete(key) : next.add(key);
    this.disabledForms.set(next);
    this.save.emit({ disabled_forms: [...next] });
  }
}
