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
import { DecimalPipe } from '@angular/common';
import * as wanakana from 'wanakana';

import { ApiService } from './api.service';
import { ruby } from './furigana';
import { AnswerResult, Exercise } from './models';

/** A session is explicit: nothing runs until it is started, and the summary
 *  only means something because it has a beginning and an end. */
type Phase = 'idle' | 'active' | 'answered' | 'ended';

const RING_RADIUS = 19;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const TICK_MS = 100;

@Component({
  selector: 'app-practice',
  // Every piece of state here is a signal, so change detection can be driven
  // by signal writes instead of by zone.js — which also covers the writes that
  // happen in a microtask, outside any patched callback.
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  template: `
    @switch (phase()) {
      @case ('idle') {
        <section class="card intro">
          <p class="lead">Conjugate the word into the form you are asked for.</p>
          <p class="hint">
            Type the reading in romaji — it turns into kana as you go.
          </p>
          <button type="button" class="primary" (click)="start()">Start session</button>
        </section>
      }

      @case ('ended') {
        <section class="card summary">
          <h2>Session finished</h2>
          <dl>
            <div><dt>Answered</dt><dd>{{ answered() }}</dd></div>
            <div>
              <dt>Correct</dt>
              <dd>{{ correct() }} <i>({{ accuracy() | number: '1.0-0' }}%)</i></dd>
            </div>
            <div><dt>Ø time</dt><dd>{{ averageSeconds() | number: '1.1-1' }} s</dd></div>
            <div>
              <dt>Elo</dt>
              <dd [class.up]="eloDelta() > 0" [class.down]="eloDelta() < 0">
                {{ eloDelta() > 0 ? '+' : '' }}{{ eloDelta() | number: '1.0-1' }}
              </dd>
            </div>
          </dl>
          <button type="button" class="primary" (click)="start()">Practice again</button>
        </section>
      }

      @default {
        @if (exercise(); as ex) {
          <section class="card prompt">
            <div class="task">
              <span class="form">{{ ex.form_title }}</span>
              <svg class="ring" viewBox="0 0 44 44" aria-hidden="true">
                <circle class="track" cx="22" cy="22" [attr.r]="radius" />
                <circle
                  class="value"
                  [class.low]="fractionLeft() < 0.25"
                  cx="22"
                  cy="22"
                  [attr.r]="radius"
                  [attr.stroke-dasharray]="circumference"
                  [attr.stroke-dashoffset]="ringOffset()"
                />
                <text x="22" y="22" [class.low]="fractionLeft() < 0.25">{{ ringLabel() }}</text>
              </svg>
            </div>

            <p class="word">
              @if (prompt(); as r) {
                @if (r.base) {
                  <ruby>{{ r.base }}<rt>{{ r.reading }}</rt></ruby>{{ r.tail }}
                } @else {
                  {{ r.tail }}
                }
              }
            </p>
            <p class="english">{{ ex.english }}</p>
          </section>

          <!-- Native submit, not ngSubmit: that one comes from NgForm and would
               need FormsModule; without it the browser would really submit the
               form and reload the page. -->
          <form #answerRow (submit)="submit($event)">
            <div class="row">
              <input
                #answerInput
                type="text"
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
                placeholder="答え"
                enterkeyhint="go"
                [class.correct]="result()?.correct === true"
                [class.wrong]="result()?.correct === false"
                (input)="scheduleSync()"
                (keyup)="scheduleSync()"
              />
              <button
                type="submit"
                class="primary"
                (mousedown)="keepFocus($event)"
                [disabled]="phase() === 'active' && !ready()"
              >
                {{ phase() === 'answered' ? 'Next' : 'Check' }}
              </button>
            </div>
            @if (romajiLeft() && phase() === 'active') {
              <p class="hint">Finish the syllable — the answer has to be kana.</p>
            }
          </form>

          @if (result(); as r) {
            <section class="card verdict" [class.ok]="r.correct">
              @if (r.correct) {
                <p class="headline">正解 <i>{{ r.fast ? 'fast' : '' }}</i></p>
              } @else {
                <p class="headline">不正解</p>
                <p class="solution">
                  @if (solution(); as s) {
                    @if (s.base) {
                      <ruby>{{ s.base }}<rt>{{ s.reading }}</rt></ruby>{{ s.tail }}
                    } @else {
                      {{ s.tail }}
                    }
                  }
                </p>
                @if (partial(); as label) {
                  <p class="partial">{{ label }}</p>
                }
              }

              <p class="elo" [class.up]="r.elo.delta > 0" [class.down]="r.elo.delta < 0">
                {{ r.elo.delta > 0 ? '+' : '' }}{{ r.elo.delta | number: '1.0-1' }} Elo
              </p>

              @if (r.transformations.length) {
                <div class="rule">
                  @for (t of r.transformations; track $index; let last = $last) {
                    <span class="step">
                      <span class="unaltered">{{ t.unaltered }}</span
                      ><span class="altered">{{ t.altered_part }}</span>
                      <span class="operation">{{ t.operation }}</span>
                      @if (last) {
                        <span class="alteration">{{ t.alteration }}</span>
                      }
                    </span>
                  }
                </div>
              }
            </section>
          }

          <button type="button" class="ghost" (click)="end()">End session</button>
        }
      }
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

    .intro .lead {
      margin: 0 0 6px;
      font-size: 1.0625rem;
    }

    .hint {
      margin: 6px 0 0;
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .intro button {
      margin-top: 18px;
    }

    .task {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    /* Plain bold, like the original. Red here would compete with the verdict
       block and leave the whole screen one colour on a wrong answer. */
    .form {
      font-weight: 700;
      color: var(--text);
    }

    .ring {
      width: 44px;
      height: 44px;
      flex: none;
    }

    .ring circle {
      fill: none;
      stroke-width: 3;
    }

    .ring .track {
      stroke: var(--surface-sunken);
    }

    .ring .value {
      stroke: var(--neutral);
      transform: rotate(-90deg);
      transform-origin: 50% 50%;
      transition: stroke-dashoffset 0.1s linear;
    }

    /* Only the stroke may turn red — filling the circle would swallow the
       number sitting inside it. */
    .ring .value.low {
      stroke: var(--wrong);
    }

    .ring text {
      fill: var(--text-muted);
      font-size: 12px;
      text-anchor: middle;
      dominant-baseline: central;
      stroke: none;
    }

    .ring text.low {
      fill: var(--wrong);
    }

    .word {
      margin: 18px 0 4px;
      font-size: 2.5rem;
      line-height: 1.6;
      text-align: center;
    }

    .word rt {
      font-size: 0.4em;
      color: var(--text-muted);
    }

    .english {
      margin: 0;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    form {
      margin-bottom: 16px;
      /* The height of the sticky header: when the answer row is scrolled to
         the top after a verdict, it has to stop below the header, not under
         it. Its compact counterpart sits in the short-viewport block. */
      scroll-margin-top: 104px;
    }

    .row {
      display: flex;
      gap: 8px;
    }

    input {
      flex: 1;
      padding: 12px 14px;
      font-size: 1.25rem;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text);
    }

    input.correct {
      border-color: var(--correct);
      color: var(--correct);
    }

    input.wrong {
      border-color: var(--wrong);
      color: var(--wrong);
    }

    button.primary {
      padding: 12px 20px;
      border: none;
      border-radius: 10px;
      background: var(--accent);
      color: #fff;
      font-weight: 600;
      flex: none;
    }

    button.primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    button.ghost {
      display: block;
      width: 100%;
      padding: 10px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: transparent;
      color: var(--text-muted);
    }

    .verdict {
      margin-top: 16px;
      background: var(--wrong-soft);
      border-color: transparent;
    }

    .verdict.ok {
      background: var(--correct-soft);
    }

    .headline {
      margin: 0;
      font-weight: 700;
      color: var(--wrong);
    }

    .verdict.ok .headline {
      color: var(--correct);
    }

    .headline i {
      font-style: normal;
      font-weight: 400;
      font-size: 0.8125rem;
      color: var(--text-muted);
      margin-left: 6px;
    }

    .solution {
      margin: 10px 0 0;
      font-size: 2rem;
      line-height: 1.6;
    }

    .solution rt {
      font-size: 0.4em;
      color: var(--text-muted);
    }

    .partial {
      margin: 6px 0 0;
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    .elo {
      margin: 10px 0 0;
      font-size: 0.875rem;
      color: var(--text-muted);
    }

    .up {
      color: var(--correct);
    }

    .down {
      color: var(--wrong);
    }

    .rule {
      margin-top: 14px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
      font-size: 1.0625rem;
      /* The chain can outgrow a narrow screen; let it scroll on its own. */
      overflow-x: auto;
      white-space: nowrap;
    }

    .rule .altered {
      text-decoration: line-through;
      color: var(--text-muted);
    }

    .rule .operation {
      margin: 0 0.5rem;
      color: var(--text-muted);
    }

    /* Blue, not the accent: this sits inside the pale-red correction block,
       where red on red would vanish. Same choice the original made. */
    .rule .unaltered,
    .rule .alteration {
      font-weight: 700;
      color: var(--rule-accent);
    }

    .summary h2 {
      margin: 0 0 14px;
      font-size: 1.125rem;
    }

    .summary dl {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin: 0 0 18px;
    }

    .summary dt {
      color: var(--text-muted);
      font-size: 0.8125rem;
    }

    .summary dd {
      margin: 2px 0 0;
      font-size: 1.375rem;
      font-weight: 600;
    }

    .summary dd i {
      font-style: normal;
      font-size: 0.875rem;
      font-weight: 400;
      color: var(--text-muted);
    }

    /* Keyboard up. The on-screen keyboard now shrinks the layout viewport
       (see the interactive-widget meta in index.html), which leaves roughly
       380px on a phone — so the exercise is trimmed to fit into it. What fits
       does not scroll, and what does not scroll cannot jump away under the
       finger that just tapped the field. */
    @media (max-height: 500px) {
      :host {
        padding-top: 10px;
      }

      .card {
        padding: 14px;
        margin-bottom: 10px;
      }

      /* Only the box shrinks — the ring is drawn in viewBox units and scales
         with it, numbers and all. */
      .ring {
        width: 36px;
        height: 36px;
      }

      .word {
        margin: 8px 0 2px;
        font-size: 2rem;
      }

      form {
        margin-bottom: 10px;
        scroll-margin-top: 100px;
      }

      button.ghost {
        padding: 8px;
      }

      .solution {
        font-size: 1.625rem;
      }
    }
  `,
})
export class PracticeComponent implements OnDestroy {
  private api = inject(ApiService);
  private injector = inject(Injector);
  private answerInput = viewChild<ElementRef<HTMLInputElement>>('answerInput');
  private answerRow = viewChild<ElementRef<HTMLElement>>('answerRow');

  readonly radius = RING_RADIUS;
  readonly circumference = RING_CIRCUMFERENCE;

  readonly phase = signal<Phase>('idle');
  readonly exercise = signal<Exercise | null>(null);
  readonly result = signal<AnswerResult | null>(null);
  readonly answered = signal(0);
  readonly correct = signal(0);
  readonly romajiLeft = signal(false);
  readonly ready = signal(false);

  private elapsed = signal(0);
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

  readonly solution = computed(() => {
    const r = this.result();
    return r ? ruby(r.expected_kanji, r.expected_hiragana) : null;
  });

  readonly fractionLeft = computed(() => {
    const ex = this.exercise();
    if (!ex || ex.target_time_ms <= 0) {
      return 1;
    }
    return Math.max(0, Math.min(1, 1 - this.elapsed() / ex.target_time_ms));
  });

  readonly ringOffset = computed(() => this.circumference * (1 - this.fractionLeft()));

  readonly ringLabel = computed(() => {
    const ex = this.exercise();
    if (!ex) {
      return '';
    }
    const left = ex.target_time_ms - this.elapsed();
    return left >= 0
      ? String(Math.ceil(left / 1000))
      : `+${(-left / 1000).toFixed(1)}`;
  });

  readonly accuracy = computed(() =>
    this.answered() ? (this.correct() / this.answered()) * 100 : 0,
  );

  readonly averageSeconds = computed(() =>
    this.answered() ? this.totalTime() / this.answered() / 1000 : 0,
  );

  readonly eloDelta = computed(() => (this.api.profile()?.elo ?? 0) - this.startElo);

  /** Which half of a wrong answer was right — the useful part of a miss. */
  readonly partial = computed(() => {
    const r = this.result();
    if (!r || r.correct) {
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
