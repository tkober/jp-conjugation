import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  SumiErrorState,
  SumiFocusModeDirective,
  SumiHanko,
  SumiPage,
  SumiShellFocusActionsDirective,
} from 'sumi-ui/layout';
import { SumiButtonDirective } from 'sumi-ui/forms';
import { SumiSessionBar, SumiSessionGate, SumiSessionSummary } from 'sumi-ui/practice';

import { ApiService } from '../../core/api.service';
import { AnswerResult, Exercise } from '../../core/models';
import { PracticeRoundComponent } from '../../shared/practice-round/practice-round.component';

/** A session is explicit: nothing runs until it is started, and the summary
 *  only means something because it has a beginning and an end. */
type Phase = 'idle' | 'active' | 'answered' | 'ended';

@Component({
  selector: 'app-practice',
  // Every piece of state here is a signal, so change detection can be driven
  // by signal writes instead of by zone.js.
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PracticeRoundComponent,
    SumiButtonDirective,
    SumiErrorState,
    SumiFocusModeDirective,
    SumiHanko,
    SumiPage,
    SumiSessionBar,
    SumiSessionGate,
    SumiSessionSummary,
    SumiShellFocusActionsDirective,
  ],
  templateUrl: './practice.component.html',
  styleUrl: './practice.component.css',
})
export class PracticeComponent {
  private api = inject(ApiService);

  readonly phase = signal<Phase>('idle');
  readonly exercise = signal<Exercise | null>(null);
  readonly result = signal<AnswerResult | null>(null);
  /** Whether the current `result` came from Alt+H rather than a typed
   *  submission — drives the "gave up" note in the round's details slot. */
  readonly gaveUp = signal(false);

  readonly answered = signal(0);
  readonly correct = signal(0);
  private readonly totalTime = signal(0);
  private startElo = 0;
  /** `null` means "unknown" (the shared profile was not loaded yet when the
   *  session started) — kept distinct from a real level so `levelUp` never
   *  guesses a rise it cannot actually see. */
  private startLevel: number | null = null;
  /** Set when the first `/api/exercise/next` of a session fails — shows
   *  `sumi-error-state` instead of the gate until the user retries. */
  readonly loadFailed = signal(false);
  private sessionStartedAt = 0;

  readonly sessionDurationMs = signal(0);

  /** Rounded to 1 decimal, like every other Elo figure in this app — the raw
   *  subtraction of two already-rounded floats otherwise prints noise such
   *  as "-14.100000000000023" in `sumi-session-summary`, which has no pipe
   *  of its own to clean that up. */
  readonly eloDelta = computed(
    () => Math.round(((this.api.profile()?.elo ?? 0) - this.startElo) * 10) / 10,
  );

  /** The session's own accuracy, not the all-time one — the hanko marks
   *  how *this* round went, next to its own answered/correct tiles. */
  private readonly sessionAccuracy = computed(() => {
    const answered = this.answered();
    return answered > 0 ? this.correct() / answered : 0;
  });

  /** 合格 ("passed") at 80 % or above, 練習 ("practice") otherwise — see
   *  docs/concept.md#tuschemotive and sumi-ui#38's `sumi-hanko` example. */
  readonly hankoCharacters = computed(() => (this.sessionAccuracy() >= 0.8 ? '合格' : '練習'));
  readonly hankoLabel = computed(() => (this.sessionAccuracy() >= 0.8 ? 'Passed' : 'Practice'));

  /** Set once the shared profile's level (updated on every `/api/answer`,
   *  see `ApiService.answer()`) is higher than it was when the session
   *  started — the same level the shell header's badge shows, just
   *  compared across the session instead of shown as-is. `undefined`
   *  (not a falsy level) so `sumi-session-summary`'s `levelUp` input, which
   *  only renders its second hanko when set, stays unset for a session
   *  without a level-up. */
  readonly levelUp = computed<string | undefined>(() => {
    const start = this.startLevel;
    const level = this.api.profile()?.level;
    if (start === null || level === undefined || level <= start) {
      return undefined;
    }
    return `Level ${level}`;
  });

  start(): void {
    this.answered.set(0);
    this.correct.set(0);
    this.totalTime.set(0);
    this.loadFailed.set(false);
    this.startElo = this.api.profile()?.elo ?? 0;
    this.startLevel = this.api.profile()?.level ?? null;
    this.sessionStartedAt = Date.now();
    this.next();
  }

  end(): void {
    this.sessionDurationMs.set(Date.now() - this.sessionStartedAt);
    this.phase.set(this.answered() ? 'ended' : 'idle');
    this.exercise.set(null);
    this.result.set(null);
  }

  /** `Enter` on a settled verdict, routed here from `app-practice-round`'s
   *  `(next)` output. */
  onNext(): void {
    this.next();
  }

  /** `Enter` on a finished, typed answer. */
  onSubmitted(event: { answer: string; timeMs: number }): void {
    this.submit(event.answer, event.timeMs, false);
  }

  /** Alt+H: reveal the solution, scored as a plain miss. */
  onGaveUpRequested(event: { timeMs: number }): void {
    this.submit('', event.timeMs, true);
  }

  private next(): void {
    this.result.set(null);
    this.gaveUp.set(false);
    this.api.nextExercise().subscribe({
      next: (exercise) => {
        this.loadFailed.set(false);
        this.exercise.set(exercise);
        this.phase.set('active');
      },
      error: () => {
        this.loadFailed.set(true);
        this.phase.set('idle');
      },
    });
  }

  private submit(answer: string, timeMs: number, gaveUp: boolean): void {
    const exercise = this.exercise();
    if (!exercise || this.phase() !== 'active') {
      return;
    }

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
      });
  }
}
