import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
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
          <form (submit)="submit($event)">
            <div class="row">
              <input
                #answerInput
                type="text"
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
                placeholder="答え"
                [readOnly]="phase() === 'answered'"
                [class.correct]="result()?.correct === true"
                [class.wrong]="result()?.correct === false"
                (input)="scheduleSync()"
                (keyup)="scheduleSync()"
              />
              <button
                type="submit"
                class="primary"
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
  `,
})
export class PracticeComponent implements OnDestroy {
  private api = inject(ApiService);
  private answerInput = viewChild<ElementRef<HTMLInputElement>>('answerInput');

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
        element.focus();
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
      const value = this.answerInput()?.nativeElement.value ?? '';
      // Only complete syllables get converted, so a half-typed "tabet" would
      // be graded as a miss. Hold the button until the kana are done.
      const unconverted = /[a-zA-Z]/.test(value);
      this.romajiLeft.set(unconverted);
      this.ready.set(value.trim().length > 0 && !unconverted);
    });
  }

  private clearInput(): void {
    const element = this.answerInput()?.nativeElement;
    if (element) {
      element.value = '';
      element.focus();
    }
    this.romajiLeft.set(false);
    this.ready.set(false);
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
