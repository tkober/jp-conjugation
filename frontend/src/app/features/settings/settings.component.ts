import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { ApiService } from '../../core/api.service';
import { Settings, SettingsUpdate } from '../../core/models';
import { FormsCardComponent } from './forms-card/forms-card.component';
import { InstructionsCardComponent } from './instructions-card/instructions-card.component';
import { VocabularyCardComponent } from './vocabulary-card/vocabulary-card.component';
import { TimeBudgetCardComponent } from './time-budget-card/time-budget-card.component';
import { ResetCardComponent } from './reset-card/reset-card.component';

/** Tab "Settings": loads the settings once and owns `apply()` — every card
 *  below emits a `save` output with its own partial `SettingsUpdate`, this
 *  component sends it (one `saveSettings()` call per user action, exactly
 *  like before the split) and applies the response, which is what resets
 *  each card's optimistic local state back to the server's view. */
@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsCardComponent,
    InstructionsCardComponent,
    VocabularyCardComponent,
    TimeBudgetCardComponent,
    ResetCardComponent,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent {
  private api = inject(ApiService);

  readonly settings = signal<Settings | null>(null);

  /** Bumped only after the time-budget card's own save resolves, so its
   *  "Saved" flash fires for its own save and not for an unrelated one
   *  (e.g. toggling a form in another card), see time-budget-card. */
  readonly budgetSaveTick = signal(0);

  constructor() {
    this.api.settings().subscribe((s) => this.apply(s));
  }

  save(update: SettingsUpdate): void {
    this.api.saveSettings(update).subscribe((s) => this.apply(s));
  }

  saveBudget(update: SettingsUpdate): void {
    this.api.saveSettings(update).subscribe((s) => {
      this.apply(s);
      this.budgetSaveTick.update((v) => v + 1);
    });
  }

  private apply(settings: Settings): void {
    this.settings.set(settings);
  }
}
