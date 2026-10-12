import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { SUMI_KEYS, SumiHotkeys, injectHotkey } from 'sumi-ui/core';
import { SumiCard } from 'sumi-ui/layout';
import { SumiButtonDirective } from 'sumi-ui/forms';
import { SUMI_PRACTICE, SumiAnswerField, type SumiVerdict } from 'sumi-ui/practice';

import { FormInstructionComponent } from '../form-instruction/form-instruction.component';
import { ruby } from '../furigana';
import { wordTypeTitle } from '../word-types';
import type { InstructionPart, InstructionStyle, Transformation } from '../../core/models';

const TICK_MS = 100;

/** The fields a practice round reads from an exercise — today's `Exercise`
 *  (see `core/models.ts`) satisfies this; the cram page (#48) has no
 *  `target_time_ms` and no timer. */
export interface RoundExercise {
  kanji: string;
  hiragana: string;
  english: string;
  instruction: InstructionPart[];
  instruction_style: InstructionStyle;
  word_type: string;
  trigger: string;
  form_title: string;
  target_time_ms?: number;
}

/** The fields a practice round reads from an answer result — today's
 *  `AnswerResult` satisfies this; a cram result (#48) has neither `fast`
 *  nor `elo`, so the "Fast answer." message and the Elo line are both
 *  conditional on their presence. */
export interface RoundResult {
  correct: boolean;
  stem_correct: boolean;
  ending_correct: boolean;
  expected_kanji: string;
  transformations: Transformation[];
  fast?: boolean;
  elo?: { delta: number };
}

/**
 * One practice round: the prompt card, the answer field and the verdict,
 * with its own keyboard handling, timer and scroll behaviour — the part of
 * `features/practice/practice.component.ts` that is not session bookkeeping
 * (see CLAUDE.md). Reused by the cram page (#48), which has no timer and no
 * Elo, hence `showTimer` and the optional `fast`/`elo` on `RoundResult`.
 *
 * The parent is expected to keep this component mounted across exercises
 * (never behind an `@if` keyed on the exercise) — `sumi-answer-field` must
 * stay the same DOM node for the on-screen keyboard to survive a Check/Next
 * (see CLAUDE.md, "Die Tastatur geht nur für einen Fokus auf …").
 */
@Component({
  selector: 'app-practice-round',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, FormInstructionComponent, SumiButtonDirective, SumiCard, ...SUMI_PRACTICE],
  templateUrl: './practice-round.component.html',
  styleUrl: './practice-round.component.css',
})
export class PracticeRoundComponent {
  private hotkeys = inject(SumiHotkeys);
  private injector = inject(Injector);
  private field = viewChild<SumiAnswerField>('field');
  private answerRow = viewChild<ElementRef<HTMLElement>>('answerRow');

  readonly exercise = input.required<RoundExercise>();
  readonly result = input.required<RoundResult | null>();
  readonly gaveUp = input.required<boolean>();
  /** `false` hides the countdown ring and the "Fast answer." message.
   *  Practice never sets it — only the cram page (#48) does. */
  readonly showTimer = input(true);

  readonly submitted = output<{ answer: string; timeMs: number }>();
  readonly gaveUpRequested = output<{ timeMs: number }>();
  readonly next = output<void>();

  readonly value = signal('');
  /** Open by default: the derivation chain is the main learning aid on a
   *  miss, so it should not need a second tap to see. `F` (registered by
   *  `sumi-verdict` itself) and the toggle button both flip it either way. */
  readonly detailsOpen = signal(true);
  readonly elapsed = signal(0);

  private shownAt = 0;
  private timer: ReturnType<typeof setInterval> | undefined;
  /** Guards a second submit for the same exercise while its result is
   *  still pending — once a result/verdict is showing, `sumi-answer-field`'s
   *  own status already blocks re-submission (see `SumiAnswerField.submit()`). */
  private readonly submittedForCurrent = signal(false);

  readonly prompt = computed(() => ruby(this.exercise().kanji, this.exercise().hiragana));

  /** Drives both `sumi-answer-field`'s `[verdict]` and `sumi-verdict`'s
   *  `[kind]`/`[message]` — the same object, exactly as the showcase wires
   *  it. This only ever produces `correct`/`wrong`: there is no held/retry
   *  state, since the caller is the sole judge of an answer and never asks
   *  for a second confirmation. */
  readonly verdict = computed<SumiVerdict | null>(() => {
    const r = this.result();
    if (!r) {
      return null;
    }
    if (r.correct) {
      return { kind: 'correct', message: r.fast && this.showTimer() ? 'Fast answer.' : undefined };
    }
    return { kind: 'wrong' };
  });

  /** Mirrors the field's own Enter-label switching (see
   *  `SumiAnswerField.submit()`) — this never reaches `held`/`retry`. */
  readonly checkButtonLabel = computed(() => {
    const kind = this.verdict()?.kind;
    return kind === 'correct' || kind === 'wrong' ? 'Next' : 'Check';
  });

  /** "I-adjective · Present, casual, negative" — which grammar was actually
   *  asked, for both a hit and a miss. For a godan verb the trigger is
   *  appended: the SRS item is form × word type × trigger, and the ending is
   *  exactly what the rule hinges on. */
  readonly grammarLine = computed(() => {
    const ex = this.exercise();
    const type =
      ex.word_type === 'godan_verb' && ex.trigger !== '-'
        ? `${wordTypeTitle(ex.word_type)} (${ex.trigger})`
        : wordTypeTitle(ex.word_type);
    return `${type} · ${ex.form_title}`;
  });

  /** Which half of a wrong answer was right — the useful part of a miss.
   *  Never shown for a given-up answer: nothing was typed, so neither half
   *  can be judged. */
  readonly partial = computed(() => {
    const r = this.result();
    if (!r || r.correct || this.gaveUp()) {
      return '';
    }
    if (r.ending_correct && !r.stem_correct) {
      return 'Right conjugation — the word itself was misread.';
    }
    if (r.stem_correct && !r.ending_correct) {
      return 'Word read correctly — the form was wrong.';
    }
    return '';
  });

  /** Link to the word's jisho.org entry. Kanji + reading, not kanji alone:
   *  tested against jisho's search, that combination puts the exact
   *  dictionary entry first even for homographs and suru verbs. */
  readonly jishoUrl = computed(() => {
    const ex = this.exercise();
    return `https://jisho.org/search/${encodeURIComponent(`${ex.kanji} ${ex.hiragana}`)}`;
  });

  constructor() {
    // New exercise: reset the field, start the per-exercise timer fresh and
    // undo the scroll the previous verdict caused — the new prompt belongs
    // at the top. Runs once for the first exercise too.
    effect(() => {
      this.exercise();
      this.value.set('');
      this.detailsOpen.set(true);
      this.submittedForCurrent.set(false);
      this.shownAt = performance.now();
      this.elapsed.set(0);
      this.startTimer();
      afterNextRender(() => window.scrollTo({ top: 0, behavior: 'smooth' }), {
        injector: this.injector,
      });
    });

    // A fresh result landed: bring the correction into view.
    effect(() => {
      if (this.result()) {
        this.revealVerdict();
      }
    });

    // `?` only becomes a hotkey once a verdict is on screen — bare keys
    // otherwise belong to the field. `F` is registered by `sumi-verdict`
    // itself as soon as its details slot has content, which it always does
    // here.
    injectHotkey({
      keys: SUMI_KEYS.help,
      label: 'Toggle this menu (after answering)',
      scope: 'feedback',
      allowInEditable: true,
      enabled: () => this.result() !== null,
      handler: () => this.hotkeys.toggleHelp(),
    });

    inject(DestroyRef).onDestroy(() => this.stopTimer());
  }

  /** `Enter` on a settled verdict, routed here from the field's `(next)`
   *  output and from the Check/Next button via `field.submit()`. */
  onNext(): void {
    this.next.emit();
  }

  /** `Enter` on a finished, typed answer. */
  onFieldSubmitted(answer: string): void {
    this.emitSubmission(() => this.submitted.emit({ answer, timeMs: this.stopAndMeasure() }));
  }

  /** Alt+H: reveal the solution, scored as a plain miss. */
  onFieldGaveUp(): void {
    this.emitSubmission(() => this.gaveUpRequested.emit({ timeMs: this.stopAndMeasure() }));
  }

  /** The Check/Next button next to the field — `sumiHoldFocus` keeps the
   *  caret (and on a phone, the keyboard) in the field; this just does
   *  whatever `Enter` would do right now. */
  onCheckClick(): void {
    this.field()?.submit();
  }

  /** Keep the on-screen keyboard open: the Jisho link must not steal focus
   *  from the answer field either (see `sumiHoldFocus` on the Check/Next
   *  button for the general mechanism — a plain `<a>` has no directive for
   *  it, so this stays a local handler). */
  keepFocus(event: Event): void {
    event.preventDefault();
  }

  private emitSubmission(emit: () => void): void {
    if (this.result() || this.submittedForCurrent()) {
      return;
    }
    this.submittedForCurrent.set(true);
    emit();
  }

  private stopAndMeasure(): number {
    this.stopTimer();
    return Math.round(performance.now() - this.shownAt);
  }

  /** Bring the correction into view, below the sticky header.
   *
   *  `sumi-answer-field` keeps its own focus across an answer (see
   *  docs/concept.md#eingabe-sumi-answer-field), so unlike a field that gets
   *  refocused, nothing here triggers the browser's native "scroll the
   *  focused element into view". With the on-screen keyboard up, the task,
   *  the input *and* the verdict do not fit on screen together (see
   *  CLAUDE.md, 360×380 reference), so the input row is scrolled to just
   *  under the header once a verdict lands — the correction and the
   *  Check/Next button then share the visible strip. The header's height is
   *  measured live rather than hardcoded: `sumi-app-shell`'s header does not
   *  publish its height as a token, and it has changed sizes once already
   *  going from the app's own layout to this one (#32). On a screen where
   *  everything already fits, this scrolls at most a few px. */
  private revealVerdict(): void {
    afterNextRender(
      () => {
        const row = this.answerRow()?.nativeElement;
        if (!row) {
          return;
        }
        const header = document.querySelector('.sumi-app-shell__header');
        row.style.scrollMarginTop = `${(header?.getBoundingClientRect().height ?? 0) + 8}px`;
        row.scrollIntoView({ block: 'start', behavior: 'smooth' });
      },
      { injector: this.injector },
    );
  }

  private startTimer(): void {
    this.stopTimer();
    this.timer = setInterval(() => {
      this.elapsed.set(performance.now() - this.shownAt);
    }, TICK_MS);
  }

  private stopTimer(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}
