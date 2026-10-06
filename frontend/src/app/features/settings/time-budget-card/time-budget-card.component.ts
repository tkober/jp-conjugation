import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { Settings, SettingsUpdate } from '../../../core/models';

/** The "Time budget" card: the two sliders, the live preview and the
 *  "Saved" flash. `baseMs`/`perKanaMs` are `linkedSignal`s off the
 *  `settings` input, so a draft resets to the saved value whenever the
 *  parent pushes fresh settings (including right after this card's own
 *  save completes) — `budgetChanged` compares the draft against that same
 *  input, no separate "saved" bookkeeping needed.
 *
 *  The flash needs to know the save it triggered actually came back, not
 *  just that *some* settings changed (toggling a form elsewhere also
 *  pushes new settings). The parent therefore bumps `saveTick` only after
 *  *this* card's own save request resolves; an `effect` here watches it and
 *  flashes "Saved" for 1500 ms. That is simpler than plumbing a result
 *  object back through the `save` output. */
@Component({
  selector: 'app-time-budget-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Block: owns a whole `.card` section in normal flow, like its siblings.
  host: { style: 'display: block' },
  imports: [DecimalPipe],
  templateUrl: './time-budget-card.component.html',
  styleUrls: ['./time-budget-card.component.css', '../settings-shared.css'],
})
export class TimeBudgetCardComponent {
  readonly settings = input.required<Settings>();
  readonly saveTick = input<number>(0);
  readonly save = output<SettingsUpdate>();

  readonly baseMs = linkedSignal(() => this.settings().time_base_ms);
  readonly perKanaMs = linkedSignal(() => this.settings().time_per_kana_ms);
  readonly budgetSaved = signal(false);

  readonly budgetChanged = computed(
    () => this.baseMs() !== this.settings().time_base_ms || this.perKanaMs() !== this.settings().time_per_kana_ms,
  );

  constructor() {
    let lastTick = this.saveTick();
    effect(() => {
      const tick = this.saveTick();
      if (tick !== lastTick) {
        lastTick = tick;
        this.budgetSaved.set(true);
        setTimeout(() => this.budgetSaved.set(false), 1500);
      }
    });
  }

  /** Same formula the backend uses; the examples come from it, not from here. */
  preview(kana: number): number {
    return this.baseMs() + this.perKanaMs() * kana;
  }

  saveBudget(): void {
    this.save.emit({ time_base_ms: this.baseMs(), time_per_kana_ms: this.perKanaMs() });
  }

  resetBudget(): void {
    this.baseMs.set(this.settings().defaults.time_base_ms);
    this.perKanaMs.set(this.settings().defaults.time_per_kana_ms);
  }
}
