import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import * as wanakana from 'wanakana';

import { ApiService } from '../../core/api.service';
import { FormInstructionComponent } from '../../shared/form-instruction/form-instruction.component';
import { ruby } from '../../shared/furigana';
import { AnswerResult, Exercise } from '../../core/models';
import { CountdownRingComponent } from './countdown-ring/countdown-ring.component';
import { VerdictComponent } from './verdict/verdict.component';
import { SessionSummaryComponent } from './session-summary/session-summary.component';

/** A session is explicit: nothing runs until it is started, and the summary
 *  only means something because it has a beginning and an end. */
type Phase = 'idle' | 'active' | 'answered' | 'ended';

const TICK_MS = 100;

@Component({
  selector: 'app-practice',
  // Every piece of state here is a signal, so change detection can be driven
  // by signal writes instead of by zone.js — which also covers the writes that
  // happen in a microtask, outside any patched callback.
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormInstructionComponent,
    CountdownRingComponent,
    VerdictComponent,
    SessionSummaryComponent,
  ],
  templateUrl: './practice.component.html',
  styleUrl: './practice.component.css',
})
export class PracticeComponent implements OnDestroy {
  private api = inject(ApiService);
  private injector = inject(Injector);
  private answerInput = viewChild<ElementRef<HTMLInputElement>>('answerInput');
  private answerRow = viewChild<ElementRef<HTMLElement>>('answerRow');

  readonly phase = signal<Phase>('idle');
  readonly exercise = signal<Exercise | null>(null);
  readonly result = signal<AnswerResult | null>(null);
  readonly answered = signal(0);
  readonly correct = signal(0);
  readonly romajiLeft = signal(false);
  readonly ready = signal(false);

  readonly elapsed = signal(0);
  private totalTime = signal(0);
  private startElo = 0;
  private shownAt = 0;
  private timer: ReturnType<typeof setInterval> | undefined;
  private bound: HTMLInputElement | null = null;
  /** The graded answer, so the field can be put back after a stray keystroke
   *  while the verdict is up — see `scheduleSync`. */
  private submitted = '';

  readonly prompt = computed(() => {
    const ex = this.exercise();
    return ex ? ruby(ex.kanji, ex.hiragana) : null;
  });

  readonly totalTimeMs = computed(() => this.totalTime());

  readonly eloDelta = computed(() => (this.api.profile()?.elo ?? 0) - this.startElo);

  constructor() {
    effect(() => {
      const element = this.answerInput()?.nativeElement ?? null;
      if (element === this.bound) {
        return;
      }
      if (this.bound) {
        wanakana.unbind(this.bound);
      }
      this.bound = element;
      if (element) {
        wanakana.bind(element);
        this.focusAnswer();
      }
    });
  }

  ngOnDestroy(): void {
    this.stopTimer();
    if (this.bound) {
      wanakana.unbind(this.bound);
      this.bound = null;
    }
  }

  start(): void {
    this.answered.set(0);
    this.correct.set(0);
    this.totalTime.set(0);
    this.startElo = this.api.profile()?.elo ?? 0;
    this.next();
  }

  next(): void {
    this.result.set(null);
    this.api.nextExercise().subscribe({
      next: (exercise) => {
        this.exercise.set(exercise);
        this.phase.set('active');
        this.clearInput();
        this.shownAt = performance.now();
        this.elapsed.set(0);
        this.startTimer();
      },
      error: () => this.phase.set('idle'),
    });
  }

  submit(event: Event): void {
    event.preventDefault();
    if (this.phase() === 'answered') {
      // Still inside the tap that triggered this: a phone opens its keyboard
      // only for a focus that happens within the gesture, so it has to be done
      // here and not when the next exercise arrives. This is what brings the
      // keyboard back if it was swiped away while reading the correction.
      this.answerInput()?.nativeElement.focus({ preventScroll: true });
      this.next();
    } else {
      this.check();
    }
  }

  check(): void {
    const exercise = this.exercise();
    const element = this.answerInput()?.nativeElement;
    if (!exercise || !element || this.phase() !== 'active' || !this.ready()) {
      return;
    }

    this.stopTimer();
    const timeMs = Math.round(performance.now() - this.shownAt);
    this.submitted = element.value;

    this.api
      .answer({
        practice_item_id: exercise.practice_item_id,
        word_id: exercise.word_id,
        answer: element.value,
        time_ms: timeMs,
      })
      .subscribe((result) => {
        this.result.set(result);
        this.phase.set('answered');
        this.revealVerdict();
        this.answered.update((n) => n + 1);
        this.totalTime.update((t) => t + timeMs);
        if (result.correct) {
          this.correct.update((n) => n + 1);
        }
      });
  }

  end(): void {
    this.stopTimer();
    this.phase.set(this.answered() ? 'ended' : 'idle');
    this.exercise.set(null);
    this.result.set(null);
  }

  /** Re-read the field after wanakana has had its turn.
   *
   *  wanakana rewrites the input from its own listener, and not always within
   *  the same task — reading synchronously sees the romaji it is about to
   *  replace. Deferring to a macrotask and listening on keyup as well as input
   *  covers typing, pasting and IME conversion alike; the read is idempotent,
   *  so firing it more often than needed costs nothing.
   */
  scheduleSync(): void {
    setTimeout(() => {
      const element = this.answerInput()?.nativeElement;
      if (!element) {
        return;
      }
      // While the verdict is up the field stays *editable* on purpose: a
      // `readonly` input makes Android close the on-screen keyboard, and it
      // would not open again by itself for the next exercise. Anything typed
      // here is simply undone instead.
      if (this.phase() !== 'active') {
        if (element.value !== this.submitted) {
          element.value = this.submitted;
        }
        return;
      }
      const value = element.value;
      // Only complete syllables get converted, so a half-typed "tabet" would
      // be graded as a miss. Hold the button until the kana are done.
      const unconverted = /[a-zA-Z]/.test(value);
      this.romajiLeft.set(unconverted);
      this.ready.set(value.trim().length > 0 && !unconverted);
    });
  }

  /** Keep the on-screen keyboard open when the Check/Next button is tapped.
   *
   *  A phone only opens the keyboard for a focus the *user* caused, so once it
   *  is up it must never be lost in between: a button takes the focus on
   *  mousedown (which a tap also fires, right before the click), and with it
   *  goes the keyboard. Cancelling that default leaves the focus in the field;
   *  the click itself still happens.
   */
  keepFocus(event: Event): void {
    event.preventDefault();
  }

  /** Bring the correction into view.
   *
   *  With the keyboard up there is no room for prompt, answer *and* verdict at
   *  once, so the answer row moves up under the header: the correction and the
   *  Next button then share the visible strip, and the prompt word is repeated
   *  in the derivation chain anyway. On a screen where everything fits there is
   *  nothing to scroll and this does nothing. */
  private revealVerdict(): void {
    afterNextRender(
      () =>
        this.answerRow()?.nativeElement.scrollIntoView({
          block: 'start',
          behavior: 'smooth',
        }),
      { injector: this.injector },
    );
  }

  /** Put the cursor back into the answer field once the new exercise is on
   *  screen. The field is (re)created by the very change detection run this
   *  call belongs to, so focusing it any earlier would find nothing — that is
   *  why it waits for the render instead of doing it inline. */
  private focusAnswer(): void {
    afterNextRender(
      () => this.answerInput()?.nativeElement.focus({ preventScroll: true }),
      { injector: this.injector },
    );
  }

  private clearInput(): void {
    const element = this.answerInput()?.nativeElement;
    if (element) {
      element.value = '';
    }
    this.submitted = '';
    this.romajiLeft.set(false);
    this.ready.set(false);
    this.focusAnswer();
    // Undo the scroll the previous verdict caused — the new prompt belongs at
    // the top, and the browser's own clamping would leave it half under the
    // header.
    afterNextRender(() => window.scrollTo({ top: 0, behavior: 'smooth' }), {
      injector: this.injector,
    });
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
