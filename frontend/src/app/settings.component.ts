import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { ApiService } from './api.service';
import { FormInstructionComponent } from './form-instruction.component';
import { InstructionDimension, InstructionStyle, Settings } from './models';

/** The old, English-order preset — kept as a TS constant because the
 *  settings screen needs it to draw the toggle even before it knows which
 *  preset (if either) is currently active. */
const TENSE_FIRST_ORDER: InstructionDimension[] = ['category', 'tense', 'politeness', 'polarity'];

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, FormInstructionComponent],
  template: `
    @if (settings(); as s) {
      <section class="card">
        <h2>Forms</h2>
        <p class="hint">
          What can come up in practice. Turning a form off leaves its progress
          untouched — it just stops being served.
        </p>

        @for (category of categories(); track category) {
          <h3>{{ category }}</h3>
          @for (group of groupsOf(category); track group.title) {
            <div class="group">
              <span class="group-title">{{ group.title }}</span>
              <div class="options">
                @for (form of group.forms; track form.form_key) {
                  <label
                    class="toggle"
                    [class.on]="!disabledForms().has(form.form_key)"
                    [title]="form.title"
                  >
                    <input
                      type="checkbox"
                      [checked]="!disabledForms().has(form.form_key)"
                      (change)="toggleForm(form.form_key)"
                    />
                    {{ form.settings_title }}
                  </label>
                }
              </div>
            </div>
          }
        }
        @if (noFormsLeft()) {
          <p class="warn">At least one form has to stay on.</p>
        }
      </section>

      <section class="card">
        <h2>Instructions</h2>
        <p class="hint">
          How the target form is shown during practice: one chip per property
          instead of a title to parse.
        </p>

        <div class="options" role="radiogroup" aria-label="Chip style">
          @for (option of s.instruction_styles; track option) {
            <label class="toggle" [class.on]="instructionStyle() === option">
              <input
                type="radio"
                name="instruction-style"
                [checked]="instructionStyle() === option"
                (change)="setInstructionStyle(option)"
              />
              {{ styleLabel(option) }}
            </label>
          }
        </div>

        <h3>Order</h3>
        <p class="hint">Move a property up or down; it saves right away.</p>
        <ol class="order-list">
          @for (dim of instructionOrder(); track dim; let i = $index) {
            <li>
              <span class="order-label">{{ dimensionLabel(dim) }}</span>
              <span class="order-buttons">
                <button
                  type="button"
                  class="ghost small"
                  [disabled]="i === 0"
                  (click)="moveInstruction(i, -1)"
                  aria-label="Move up"
                >▲</button>
                <button
                  type="button"
                  class="ghost small"
                  [disabled]="i === instructionOrder().length - 1"
                  (click)="moveInstruction(i, 1)"
                  aria-label="Move down"
                >▼</button>
              </span>
            </li>
          }
        </ol>

        <div class="actions">
          <button
            type="button"
            class="ghost"
            [disabled]="isActiveOrder(s.defaults.instruction_order)"
            (click)="applyOrder(s.defaults.instruction_order)"
          >
            Japanese build order
          </button>
          <button
            type="button"
            class="ghost"
            [disabled]="isActiveOrder(tenseFirstOrder)"
            (click)="applyOrder(tenseFirstOrder)"
          >
            Tense first
          </button>
        </div>

        <h3>Preview</h3>
        <div class="preview">
          @for (example of s.instruction_examples; track $index) {
            <app-form-instruction [parts]="example" [mode]="instructionStyle()" />
          }
        </div>

        @if (instructionStyle() !== 'text') {
          <h3>Legend</h3>
          <ul class="legend">
            @for (dim of s.instruction_dimensions; track dim.dimension) {
              @for (value of dim.values; track value.value) {
                @if (value.emoji) {
                  <li><span aria-hidden="true">{{ value.emoji }}</span> {{ value.label }}</li>
                }
              }
            }
          </ul>
        }
        <p class="hint">Present covers present and future (non-past).</p>
      </section>

      <section class="card">
        <h2>Vocabulary</h2>
        <p class="hint">Which JLPT levels words are drawn from.</p>
        <div class="options">
          @for (level of s.jlpt_levels; track level) {
            <label class="toggle" [class.on]="!disabledJlpt().has(level)">
              <input
                type="checkbox"
                [checked]="!disabledJlpt().has(level)"
                (change)="toggleLevel(level)"
              />
              {{ level.toUpperCase() }}
            </label>
          }
        </div>
        @if (noLevelsLeft()) {
          <p class="warn">At least one level has to stay on.</p>
        }
      </section>

      <section class="card">
        <h2>Time budget</h2>
        <p class="hint">
          How long an answer may take before it counts as slow. Covers working
          out the form and typing it — a touchscreen needs more than a keyboard.
        </p>

        <label class="slider">
          <span>Base <b>{{ baseMs() | number: '1.0-0' }} ms</b></span>
          <input
            type="range"
            [min]="s.limits.time_base_ms[0]"
            [max]="s.limits.time_base_ms[1]"
            step="100"
            [value]="baseMs()"
            (input)="baseMs.set(+$any($event.target).value)"
          />
        </label>

        <label class="slider">
          <span>Per kana <b>{{ perKanaMs() | number: '1.0-0' }} ms</b></span>
          <input
            type="range"
            [min]="s.limits.time_per_kana_ms[0]"
            [max]="s.limits.time_per_kana_ms[1]"
            step="50"
            [value]="perKanaMs()"
            (input)="perKanaMs.set(+$any($event.target).value)"
          />
        </label>

        <ul class="examples">
          @for (example of s.examples; track example.kana) {
            <li>
              <span>{{ example.kana }} kana</span>
              <b>{{ preview(example.kana) / 1000 | number: '1.1-1' }} s</b>
            </li>
          }
        </ul>

        <div class="actions">
          <button type="button" class="primary" [disabled]="!budgetChanged()" (click)="saveBudget()">
            {{ budgetSaved() ? 'Saved' : 'Save' }}
          </button>
          <button type="button" class="ghost" (click)="resetBudget(s)">Back to defaults</button>
        </div>
      </section>

      <section class="card danger">
        <h2>Reset progress</h2>
        <p class="hint">
          Clears every answer, all ratings and both streaks. The vocabulary and
          the time budget stay.
        </p>
        @switch (resetStep()) {
          @case (0) {
            <button type="button" class="ghost" (click)="resetStep.set(1)">Reset…</button>
          }
          @case (1) {
            <p class="warn">This cannot be undone.</p>
            <div class="actions">
              <button type="button" class="ghost" (click)="resetStep.set(0)">Cancel</button>
              <button type="button" class="destructive" (click)="resetStep.set(2)">
                I understand
              </button>
            </div>
          }
          @case (2) {
            <p class="warn">Really delete all progress?</p>
            <div class="actions">
              <button type="button" class="ghost" (click)="resetStep.set(0)">Cancel</button>
              <button type="button" class="destructive" (click)="doReset()">Delete</button>
            </div>
          }
          @case (3) {
            <p class="done">Progress cleared.</p>
          }
        }
      </section>
    } @else {
      <p class="loading">Loading…</p>
    }
  `,
  styles: `
    :host {
      display: block;
      padding-top: 24px;
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 20px;
      margin-bottom: 16px;
    }

    h2 {
      margin: 0 0 4px;
      font-size: 1.0625rem;
    }

    h3 {
      margin: 18px 0 8px;
      font-size: 0.8125rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
    }

    .hint {
      margin: 0 0 12px;
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .group {
      margin-bottom: 12px;
    }

    .group-title {
      display: block;
      font-size: 0.8125rem;
      color: var(--text-muted);
      margin-bottom: 6px;
    }

    .options {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--surface-sunken);
      color: var(--text-muted);
      font-size: 0.875rem;
      cursor: pointer;
    }

    .toggle.on {
      background: var(--accent-soft);
      border-color: var(--accent);
      color: var(--text);
    }

    .toggle input {
      accent-color: var(--accent);
      margin: 0;
    }

    .slider {
      display: block;
      margin-bottom: 14px;
    }

    .slider span {
      display: block;
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-bottom: 4px;
    }

    .slider b {
      color: var(--text);
    }

    .slider input {
      width: 100%;
      accent-color: var(--accent);
    }

    .examples {
      list-style: none;
      display: flex;
      gap: 8px;
      padding: 0;
      margin: 4px 0 16px;
    }

    .examples li {
      flex: 1;
      background: var(--surface-sunken);
      border-radius: 10px;
      padding: 8px;
      text-align: center;
      font-size: 0.8125rem;
      color: var(--text-muted);
    }

    .examples b {
      display: block;
      font-size: 1rem;
      color: var(--text);
    }

    .actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    button {
      padding: 10px 16px;
      border-radius: 10px;
      font-weight: 600;
      border: 1px solid transparent;
    }

    button.primary {
      background: var(--accent);
      color: #fff;
    }

    button.primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    button.ghost {
      background: transparent;
      border-color: var(--border);
      color: var(--text-muted);
    }

    button.destructive {
      background: var(--wrong);
      color: #fff;
    }

    .warn {
      color: var(--wrong);
      font-size: 0.875rem;
      margin: 0 0 10px;
    }

    .done {
      color: var(--correct);
      font-size: 0.875rem;
      margin: 0;
    }

    .loading {
      color: var(--text-muted);
    }

    .danger {
      border-color: var(--wrong);
    }

    .order-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 0;
      margin: 0 0 14px;
    }

    .order-list li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 12px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--surface-sunken);
    }

    .order-label {
      font-size: 0.9375rem;
    }

    .order-buttons {
      display: flex;
      gap: 4px;
    }

    button.ghost.small {
      padding: 4px 10px;
      font-size: 0.8125rem;
      line-height: 1;
    }

    button.ghost.small:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .preview {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin: 4px 0 16px;
    }

    .legend {
      list-style: none;
      display: flex;
      flex-wrap: wrap;
      gap: 6px 14px;
      padding: 0;
      margin: 0 0 16px;
      font-size: 0.8125rem;
      color: var(--text-muted);
    }
  `,
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
