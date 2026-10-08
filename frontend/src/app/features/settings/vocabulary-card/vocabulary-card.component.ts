import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';

import { SumiCard } from 'sumi-ui/layout';
import { SumiToggle } from 'sumi-ui/forms';

import { Settings, SettingsUpdate } from '../../../core/models';

/** The "Vocabulary" card: which JLPT levels words are drawn from.
 *  `disabledJlpt` is a `linkedSignal` off the `settings` input for the same
 *  optimistic-toggle reason as the forms card. */
@Component({
  selector: 'app-vocabulary-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Block: owns a whole `.card` section in normal flow, like its siblings.
  host: { style: 'display: block' },
  imports: [SumiCard, SumiToggle],
  templateUrl: './vocabulary-card.component.html',
  styleUrls: ['./vocabulary-card.component.css', '../settings-shared.css'],
})
export class VocabularyCardComponent {
  readonly settings = input.required<Settings>();
  readonly save = output<SettingsUpdate>();

  readonly disabledJlpt = linkedSignal(() => new Set(this.settings().disabled_jlpt));

  readonly noLevelsLeft = computed(() => {
    const levels = this.settings().jlpt_levels;
    return levels.length > 0 && this.disabledJlpt().size >= levels.length;
  });

  /** Vetoes turning a level off when it is the last one still on — see
   *  `FormsCardComponent.canDisable`'s doc comment for why this is a
   *  `[canChange]` predicate rather than a reverted `[value]` binding. */
  canDisable(level: string): (next: boolean) => boolean {
    return (next) => {
      if (next) {
        return true;
      }
      const stillOff = this.disabledJlpt().has(level)
        ? this.disabledJlpt().size
        : this.disabledJlpt().size + 1;
      return stillOff < this.settings().jlpt_levels.length;
    };
  }

  toggleLevel(level: string, isOn: boolean): void {
    const next = new Set(this.disabledJlpt());
    isOn ? next.delete(level) : next.add(level);
    this.disabledJlpt.set(next);
    this.save.emit({ disabled_jlpt: [...next] });
  }
}
