import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { SUMI_KEYS, SumiHotkeys, injectHotkey } from 'sumi-ui/core';
import { SumiCard, SumiFocusModeDirective, SumiPage, SumiShellFocusActionsDirective } from 'sumi-ui/layout';
import { SumiButtonDirective } from 'sumi-ui/forms';
import { SUMI_PRACTICE, SumiAnswerField, type SumiVerdict } from 'sumi-ui/practice';

import { ApiService } from '../../core/api.service';
import { FormInstructionComponent } from '../../shared/form-instruction/form-instruction.component';
import { ruby } from '../../shared/furigana';
import { wordTypeTitle } from '../../shared/word-types';
import { AnswerResult, Exercise } from '../../core/models';

/** A session is explicit: nothing runs until it is started, and the summary
 *  only means something because it has a beginning and an end. */
type Phase = 'idle' | 'active' | 'answered' | 'ended';

const TICK_MS = 100;

@Component({
  selector: 'app-practice',
  // Every piece of state here is a signal, so change detection can be driven
  // by signal writes instead of by zone.js.
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    FormInstructionComponent,
    SumiButtonDirective,
    SumiCard,
    SumiFocusModeDirective,
    SumiPage,
    SumiShellFocusActionsDirective,
    ...SUMI_PRACTICE,
  ],
  templateUrl: './practice.component.html',
  styleUrl: './practice.component.css',
})
export class PracticeComponent {
  private api = inject(ApiService);
  private hotkeys = inject(SumiHotkeys);
  private injector = inject(Injector);
  private field = viewChild<SumiAnswerField>('field');
  private answerRow = viewChild<ElementRef<HTMLElement>>('answerRow');

  readonly phase = signal<Phase>('idle');
  readonly exercise = signal<Exercise | null>(null);
  readonly result = signal<AnswerResult | null>(null);
  /** Whether the current `result` came from Alt+H rather than a typed
   *  submission — drives the "gave up" note in the details slot. */
  readonly gaveUp = signal(false);
  readonly value = signal('');
  /** Open by default: the derivation chain is the main learning aid on a
   *  miss, so it should not need a second tap to see. `F` (registered by
   *  `sumi-verdict` itself) and the toggle button both flip it either way. */
  readonly detailsOpen = signal(true);

  readonly answered = signal(0);
  readonly correct = signal(0);
  readonly elapsed = signal(0);
  private readonly totalTime = signal(0);
  private startElo = 0;
  private shownAt = 0;
  private sessionStartedAt = 0;
  private timer: ReturnType<typeof setInterval> | undefined;

  readonly sessionDurationMs = signal(0);

  readonly prompt = computed(() => {
    const ex = this.exercise();
    return ex ? ruby(ex.kanji, ex.hiragana) : null;
  });

  /** Rounded to 1 decimal, like every other Elo figure in this app — the raw
   *  subtraction of two already-rounded floats otherwise prints noise such
   *  as "-14.100000000000023" in `sumi-session-summary`, which has no pipe
   *  of its own to clean that up. */
  readonly eloDelta = computed(
    () => Math.round(((this.api.profile()?.elo ?? 0) - this.startElo) * 10) / 10,
  );

  /** Drives both `sumi-answer-field`'s `[verdict]` and `sumi-verdict`'s
   *  `[kind]`/`[message]` — the same object, exactly as the showcase wires
   *  it. This app only ever produces `correct`/`wrong`: there is no
   *  held/retry state, since the backend is the sole judge of an answer and
   *  never asks for a second confirmation. */
  readonly verdict = computed<SumiVerdict | null>(() => {
    const r = this.result();
    if (!r) {
      return null;
    }
    if (r.correct) {
      return { kind: 'correct', message: r.fast ? 'Fast answer.' : undefined };
    }
    return { kind: 'wrong' };
  });

  /** Mirrors the field's own Enter-label switching (see
   *  `SumiAnswerField.submit()`) — this app never reaches `held`/`retry`. */
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
    if (!ex) {
      return '';
    }
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
    return ex ? `https://jisho.org/search/${encodeURIComponent(`${ex.kanji} ${ex.hiragana}`)}` : '';
  });

  constructor() {
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

  start(): void {
    this.answered.set(0);
    this.correct.set(0);
    this.totalTime.set(0);
    this.startElo = this.api.profile()?.elo ?? 0;
    this.sessionStartedAt = Date.now();
    this.next();
  }

  end(): void {
    this.stopTimer();
    this.sessionDurationMs.set(Date.now() - this.sessionStartedAt);
    this.phase.set(this.answered() ? 'ended' : 'idle');
    this.exercise.set(null);
    this.result.set(null);
  }

  /** `Enter` on a settled verdict, routed here from the field's `(next)`
   *  output and from the Check/Next button via `field.submit()`. */
  onNext(): void {
    this.next();
  }

  /** `Enter` on a finished, typed answer. */
  onSubmitted(answer: string): void {
    this.submit(answer, false);
  }

  /** Alt+H: reveal the solution, scored as a plain miss. */
  onGaveUp(): void {
    this.submit('', true);
  }

  /** The Check/Next button next to the field — `sumiHoldFocus` keeps the
   *  caret (and on a phone, the keyboard) in the field; this just does
   *  whatever `Enter` would do right now. */
  onCheckClick(): void {
    this.field()?.submit();
  }

  private next(): void {
    this.result.set(null);
    this.value.set('');
    this.gaveUp.set(false);
    this.detailsOpen.set(true);
    this.api.nextExercise().subscribe({
      next: (exercise) => {
        this.exercise.set(exercise);
        this.phase.set('active');
        this.shownAt = performance.now();
        this.elapsed.set(0);
        this.startTimer();
        // Undo the scroll the previous verdict caused — the new prompt
        // belongs at the top.
        afterNextRender(() => window.scrollTo({ top: 0, behavior: 'smooth' }), {
          injector: this.injector,
        });
      },
      error: () => this.phase.set('idle'),
    });
  }

  private submit(answer: string, gaveUp: boolean): void {
    const exercise = this.exercise();
    if (!exercise || this.phase() !== 'active') {
      return;
    }

    this.stopTimer();
    const timeMs = Math.round(performance.now() - this.shownAt);
    this.gaveUp.set(gaveUp);

    this.api
      .answer({
        practice_item_id: exercise.practice_item_id,
        word_id: exercise.word_id,
        answer,
        time_ms: timeMs,
        gave_up: gaveUp,
      })
      .subscribe((result) => {
        this.result.set(result);
        this.phase.set('answered');
        this.answered.update((n) => n + 1);
        this.totalTime.update((t) => t + timeMs);
        if (result.correct) {
          this.correct.update((n) => n + 1);
        }
        this.revealVerdict();
      });
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

  /** Keep the on-screen keyboard open: the Jisho link must not steal focus
   *  from the answer field either (see `sumiHoldFocus` on the Check/Next
   *  button for the general mechanism — a plain `<a>` has no directive for
   *  it, so this stays a local handler). */
  keepFocus(event: Event): void {
    event.preventDefault();
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
