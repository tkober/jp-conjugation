import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { InstructionPart, InstructionStyle } from './models';

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
  template: `
    @for (p of parts(); track p.dimension) {
      @switch (mode()) {
        @case ('emoji') {
          <span
            class="chip emoji-only"
            [class.marked]="p.marked"
            [attr.data-dim]="p.dimension"
            role="img"
            [attr.aria-label]="p.label"
            [attr.title]="p.label"
          >{{ p.emoji }}</span>
        }
        @case ('both') {
          <span class="chip" [class.marked]="p.marked" [attr.data-dim]="p.dimension">
            <span aria-hidden="true">{{ p.emoji }}</span>{{ p.label }}
          </span>
        }
        @default {
          <span class="chip" [class.marked]="p.marked" [attr.data-dim]="p.dimension">
            {{ p.label }}
          </span>
        }
      }
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 2px 10px;
      font-weight: 600;
      font-size: 0.8125rem;
      color: var(--text);
      white-space: nowrap;
    }

    .chip.emoji-only {
      font-size: 1.375rem;
      line-height: 1;
      padding: 2px 8px;
    }

    /* Filled/inverted, not a colour swap — a second hue here would compete
       with the correct/wrong verdict elsewhere on the same screen. */
    .chip.marked {
      background: var(--text);
      border-color: var(--text);
      color: var(--surface);
    }

    /* A dark fill swallows dark emoji (🎩) and mutes red ones (🚫) — the
       emoji already differ, so an emoji-only chip marks with a heavier
       outline instead. */
    .chip.emoji-only.marked {
      background: transparent;
      border-color: var(--text);
      box-shadow: inset 0 0 0 1px var(--text);
    }

    /* The form/category chip gets the same blue used for the derivation
       chain — it is the one dimension every exercise has, so it anchors the
       row. No red: red already means "wrong" on this screen. */
    .chip[data-dim='category'] {
      border-color: var(--rule-accent);
      color: var(--rule-accent);
    }

    .chip[data-dim='category'].marked {
      background: var(--rule-accent);
      border-color: var(--rule-accent);
      color: var(--surface);
    }

    @media (max-height: 500px) {
      .chip {
        padding: 1px 8px;
        font-size: 0.75rem;
      }

      .chip.emoji-only {
        font-size: 1.125rem;
      }
    }
  `,
})
export class FormInstructionComponent {
  readonly parts = input.required<InstructionPart[]>();
  readonly mode = input<InstructionStyle>('text');

  readonly joinedLabel = computed(() => this.parts().map((p) => p.label).join(' · '));
}
