import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { InstructionPart, InstructionStyle } from '../../core/models';

/** Renders a target form as a row of chips instead of a flat title.
 *
 *  One chip per dimension (see `backend/app/conjugation/instruction.py` for
 *  why dimensions are data): the key difference between two forms shows up as
 *  its own chip instead of hiding behind a shared suffix, and the order is a
 *  user setting instead of frozen prose.
 *
 *  The input is named `mode`, not `style` — `style` collides with the
 *  built-in DOM property Angular already binds on every host element, and a
 *  component input of that name would silently never receive a value. */
@Component({
  selector: 'app-form-instruction',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'group',
    '[attr.aria-label]': 'joinedLabel()',
    '[attr.title]': 'joinedLabel()',
  },
  templateUrl: './form-instruction.component.html',
  styleUrl: './form-instruction.component.css',
})
export class FormInstructionComponent {
  readonly parts = input.required<InstructionPart[]>();
  readonly mode = input<InstructionStyle>('text');

  readonly joinedLabel = computed(() => this.parts().map((p) => p.label).join(' · '));
}
