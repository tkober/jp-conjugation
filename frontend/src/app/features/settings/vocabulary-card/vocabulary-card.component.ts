import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';

import { Settings, SettingsUpdate } from '../../../core/models';

/** The "Vocabulary" card: which JLPT levels words are drawn from.
 *  `disabledJlpt` is a `linkedSignal` off the `settings` input for the same
 *  optimistic-toggle reason as the forms card. */
@Component({
  selector: 'app-vocabulary-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Block: owns a whole `.card` section in normal flow, like its siblings.
  host: { style: 'display: block' },
  imports: [],
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

  toggleLevel(level: string): void {
    const next = new Set(this.disabledJlpt());
    next.has(level) ? next.delete(level) : next.add(level);
    if (next.size >= this.settings().jlpt_levels.length) {
      return; // at least one level stays on
    }
    this.disabledJlpt.set(next);
    this.save.emit({ disabled_jlpt: [...next] });
  }
}
