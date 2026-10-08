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

  /** `toggleRef` is the clicked `sumi-toggle`: see `FormsCardComponent
   *  .toggleForm`'s doc comment for why the guard reverts it directly on
   *  the instance instead of relying on the `[value]` binding alone. */
  toggleLevel(level: string, toggleRef: SumiToggle): void {
    const next = new Set(this.disabledJlpt());
    next.has(level) ? next.delete(level) : next.add(level);
    if (next.size >= this.settings().jlpt_levels.length) {
      toggleRef.value.set(!this.disabledJlpt().has(level)); // revert
      return; // at least one level stays on
    }
    this.disabledJlpt.set(next);
    this.save.emit({ disabled_jlpt: [...next] });
  }
}
