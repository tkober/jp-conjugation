import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';

import { SumiCard } from 'sumi-ui/layout';
import { SumiButtonDirective, SumiSegmentedControl, type SumiSegmentedOption } from 'sumi-ui/forms';

import { FormInstructionComponent } from '../../../shared/form-instruction/form-instruction.component';
import { InstructionDimension, InstructionStyle, Settings, SettingsUpdate } from '../../../core/models';

/** The old, English-order preset — kept as a TS constant because the card
 *  needs it to draw the toggle even before it knows which preset (if
 *  either) is currently active. */
const TENSE_FIRST_ORDER: InstructionDimension[] = ['category', 'tense', 'politeness', 'polarity'];

/** The "Instructions" card: chip style, the order of the four dimensions
 *  (with the two presets), a live preview and, outside the text style, the
 *  legend. `instructionStyle`/`instructionOrder` are `linkedSignal`s off the
 *  `settings` input for the same optimistic-toggle reason as the other
 *  cards — every change here saves right away. */
@Component({
  selector: 'app-instructions-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Block: owns a whole `.card` section in normal flow, like its siblings.
  host: { style: 'display: block' },
  imports: [SumiCard, SumiButtonDirective, SumiSegmentedControl, FormInstructionComponent],
  templateUrl: './instructions-card.component.html',
  styleUrls: ['./instructions-card.component.css', '../settings-shared.css'],
})
export class InstructionsCardComponent {
  readonly settings = input.required<Settings>();
  readonly save = output<SettingsUpdate>();

  readonly instructionStyle = linkedSignal(() => this.settings().instruction_style);
  readonly instructionOrder = linkedSignal(() => this.settings().instruction_order);

  readonly tenseFirstOrder = TENSE_FIRST_ORDER;

  readonly styleOptions = computed<SumiSegmentedOption<InstructionStyle>[]>(() =>
    this.settings().instruction_styles.map((style) => ({ value: style, label: this.styleLabel(style) })),
  );

  styleLabel(style: InstructionStyle): string {
    return { text: 'Text', emoji: 'Emoji', both: 'Text + emoji' }[style];
  }

  dimensionLabel(dim: InstructionDimension): string {
    const info = this.settings().instruction_dimensions.find((d) => d.dimension === dim);
    return info?.label ?? dim;
  }

  setInstructionStyle(style: InstructionStyle): void {
    this.instructionStyle.set(style);
    this.save.emit({ instruction_style: style });
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
    this.save.emit({ instruction_order: order });
  }
}
