import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { ApiService } from '../../core/api.service';
import { FormInstructionComponent } from '../../shared/form-instruction/form-instruction.component';
import { InstructionDimension, InstructionStyle, Settings } from '../../core/models';

/** The old, English-order preset — kept as a TS constant because the
 *  settings screen needs it to draw the toggle even before it knows which
 *  preset (if either) is currently active. */
const TENSE_FIRST_ORDER: InstructionDimension[] = ['category', 'tense', 'politeness', 'polarity'];

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, FormInstructionComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent {
  private api = inject(ApiService);

  readonly settings = signal<Settings | null>(null);
  readonly disabledForms = signal<Set<string>>(new Set());
  readonly disabledJlpt = signal<Set<string>>(new Set());
  readonly baseMs = signal(0);
  readonly perKanaMs = signal(0);
  readonly budgetSaved = signal(false);
  readonly resetStep = signal(0);
  readonly instructionStyle = signal<InstructionStyle>('text');
  readonly instructionOrder = signal<InstructionDimension[]>([]);

  readonly tenseFirstOrder = TENSE_FIRST_ORDER;

  private savedBase = 0;
  private savedPerKana = 0;

  readonly categories = computed(() => {
    const groups = this.settings()?.groups ?? [];
    return [...new Set(groups.map((g) => g.category))];
  });

  readonly noFormsLeft = computed(() => {
    const total = (this.settings()?.groups ?? []).reduce((n, g) => n + g.forms.length, 0);
    return total > 0 && this.disabledForms().size >= total;
  });

  readonly noLevelsLeft = computed(() => {
    const levels = this.settings()?.jlpt_levels ?? [];
    return levels.length > 0 && this.disabledJlpt().size >= levels.length;
  });

  readonly budgetChanged = computed(
    () => this.baseMs() !== this.savedBase || this.perKanaMs() !== this.savedPerKana,
  );

  constructor() {
    this.api.settings().subscribe((s) => this.apply(s));
  }

  groupsOf(category: string) {
    return (this.settings()?.groups ?? []).filter((g) => g.category === category);
  }

  /** Same formula the backend uses; the examples come from it, not from here. */
  preview(kana: number): number {
    return this.baseMs() + this.perKanaMs() * kana;
  }

  toggleForm(key: string): void {
    const next = new Set(this.disabledForms());
    next.has(key) ? next.delete(key) : next.add(key);
    if (next.size >= this.totalForms()) {
      return; // the backend would reject it anyway
    }
    this.disabledForms.set(next);
    this.api.saveSettings({ disabled_forms: [...next] }).subscribe((s) => this.apply(s));
  }

  toggleLevel(level: string): void {
    const next = new Set(this.disabledJlpt());
    next.has(level) ? next.delete(level) : next.add(level);
    if (next.size >= (this.settings()?.jlpt_levels ?? []).length) {
      return;
    }
    this.disabledJlpt.set(next);
    this.api.saveSettings({ disabled_jlpt: [...next] }).subscribe((s) => this.apply(s));
  }

  saveBudget(): void {
    this.api
      .saveSettings({ time_base_ms: this.baseMs(), time_per_kana_ms: this.perKanaMs() })
      .subscribe((s) => {
        this.apply(s);
        this.budgetSaved.set(true);
        setTimeout(() => this.budgetSaved.set(false), 1500);
      });
  }

  resetBudget(settings: Settings): void {
    this.baseMs.set(settings.defaults.time_base_ms);
    this.perKanaMs.set(settings.defaults.time_per_kana_ms);
  }

  styleLabel(style: InstructionStyle): string {
    return { text: 'Text', emoji: 'Emoji', both: 'Text + emoji' }[style];
  }

  dimensionLabel(dim: InstructionDimension): string {
    const info = this.settings()?.instruction_dimensions.find((d) => d.dimension === dim);
    return info?.label ?? dim;
  }

  setInstructionStyle(style: InstructionStyle): void {
    this.instructionStyle.set(style);
    this.api.saveSettings({ instruction_style: style }).subscribe((s) => this.apply(s));
  }

  moveInstruction(index: number, delta: number): void {
    const order = [...this.instructionOrder()];
    const target = index + delta;
    if (target < 0 || target >= order.length) {
      return;
    }
    [order[index], order[target]] = [order[target], order[index]];
    this.applyOrder(order);
  }

  isActiveOrder(order: InstructionDimension[]): boolean {
    const current = this.instructionOrder();
    return current.length === order.length && current.every((d, i) => d === order[i]);
  }

  applyOrder(order: InstructionDimension[]): void {
    this.instructionOrder.set(order);
    this.api.saveSettings({ instruction_order: order }).subscribe((s) => this.apply(s));
  }

  doReset(): void {
    this.api.reset().subscribe(() => {
      this.resetStep.set(3);
      this.api.loadProfile().subscribe();
    });
  }

  private totalForms(): number {
    return (this.settings()?.groups ?? []).reduce((n, g) => n + g.forms.length, 0);
  }

  private apply(settings: Settings): void {
    this.settings.set(settings);
    this.disabledForms.set(new Set(settings.disabled_forms));
    this.disabledJlpt.set(new Set(settings.disabled_jlpt));
    this.baseMs.set(settings.time_base_ms);
    this.perKanaMs.set(settings.time_per_kana_ms);
    this.savedBase = settings.time_base_ms;
    this.savedPerKana = settings.time_per_kana_ms;
    this.instructionStyle.set(settings.instruction_style);
    this.instructionOrder.set(settings.instruction_order);
  }
}
