import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import {
  SumiBadge,
  SumiErrorState,
  SumiFocusModeDirective,
  SumiHanko,
  SumiPage,
  SumiShellFocusActionsDirective,
} from 'sumi-ui/layout';
import { SumiButtonDirective } from 'sumi-ui/forms';
import {
  SumiSessionBar,
  SumiSessionGate,
  SumiSessionSummary,
  SumiSummaryTile,
} from 'sumi-ui/practice';

import { ApiService } from '../../core/api.service';
import { CramExercise, CramForm, CramResult } from '../../core/models';
import { PracticeRoundComponent } from '../../shared/practice-round/practice-round.component';
import { CramQueueEntry, scheduleCramRetry, takeCramRetry } from './cram-queue';

/** Same shape as `PracticeComponent`'s session lifecycle (see CLAUDE.md) —
 *  cram just never writes anything while it runs. */
type Phase = 'idle' | 'active' | 'answered' | 'ended';

/** `recent_word_ids` is capped client-side at this many entries — cram has
 *  no `attempts` history to read from (see `app/cram.py`'s module
 *  docstring), so the client collects it itself. */
const MAX_RECENT_WORDS = 20;

/**
 * Cram (#48, epic #45): drill a single form on words of every type, graded
 * exactly like Practice but never scored — no Elo, no item/word rating, no
 * streak, no `Attempt` row (see `app/cram.py`). Reached from the Rules
 * table's "Cram this form" button and from Stats' "Weakest rules" rule
 * names, and reachable directly via `/practice/cram/:form`.
 *
 * Reuses `shared/practice-round/practice-round.component.ts` for the round
 * itself (`[showTimer]="false"` hides the countdown ring and the "Fast
 * answer." message, since cram has neither a time budget nor Elo) and
 * projects a `sumi-badge roundTag` into its task row in place of the ring —
 * see that component's doc comment for the `[roundTag]` slot.
 *
 * The route param (`:form`) drives everything: a change (even while a
 * session is running) reloads the form and resets straight back to the
 * gate, via the `effect()` in the constructor.
 *
 * **Retries (#49).** A wrong or given-up answer goes into `queue`
 * (`cram-queue.ts`'s pure, TestBed-free scheduling): it comes back after 3
 * other exercises, same word and form item, at most twice, then is dropped;
 * a correct retry is simply never rescheduled. `served` counts every
 * exercise handed out this session, retries included — `cram-queue.ts`'s
 * `dueAt` is in that unit. `isRetry`/`currentAttempts` track the exercise
 * currently on screen so the badge and the queue-on-miss logic can tell a
 * retry from a first attempt without re-deriving it from `queue`, which no
 * longer holds the entry while it's being served. `answered`/`correct` —
 * and therefore the hanko, which stays on first-attempt accuracy — count
 * first attempts only; `retried`/`retriedCorrect` count retries separately
 * and surface as an extra `sumiSummaryTile` ("Retried") inside
 * `sumi-session-summary` (sumi-ui#48, available since #54).
 */
@Component({
  selector: 'app-cram',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PracticeRoundComponent,
    RouterLink,
    SumiBadge,
    SumiButtonDirective,
    SumiErrorState,
    SumiFocusModeDirective,
    SumiHanko,
    SumiPage,
    SumiSessionBar,
    SumiSessionGate,
    SumiSessionSummary,
    SumiSummaryTile,
    SumiShellFocusActionsDirective,
  ],
  templateUrl: './cram.component.html',
  styleUrl: './cram.component.css',
})
export class CramComponent {
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  readonly formKey = toSignal(this.route.paramMap.pipe(map((p) => p.get('form') ?? '')), {
    initialValue: '',
  });

  readonly form = signal<CramForm | null>(null);
  /** `/api/cram/forms/{form_key}` returned 404 — the form key itself does
   *  not exist. */
  readonly formNotFound = signal(false);
  /** `/api/cram/forms/{form_key}` failed for any other reason. */
  readonly formLoadFailed = signal(false);

  readonly phase = signal<Phase>('idle');
  readonly exercise = signal<CramExercise | null>(null);
  readonly result = signal<CramResult | null>(null);
  /** Whether the current `result` came from Alt+H rather than a typed
   *  submission — drives the "gave up" note in the round's details slot. */
  readonly gaveUp = signal(false);

  /** First attempts only (#49) — a retry never touches these, so the hanko
   *  (built on `sessionAccuracy` below) keeps reading first-attempt
   *  accuracy. */
  readonly answered = signal(0);
  readonly correct = signal(0);
  /** Retries only — a correct or wrong retry counts here instead of in
   *  `answered`/`correct`. Rendered as an extra summary tile on the ended
   *  screen, only when `retried() > 0`. */
  readonly retried = signal(0);
  readonly retriedCorrect = signal(0);
  /** Set when the first `/api/cram/next` of a session fails — shows
   *  `sumi-error-state` instead of the gate until the user retries, same as
   *  Practice's T6. */
  readonly loadFailed = signal(false);
  private sessionStartedAt = 0;
  readonly sessionDurationMs = signal(0);

  /** Whether the exercise on screen right now is a retry `next()` just
   *  dequeued from `queue` — drives the `roundTag` badge text and which
   *  counters `submit()` updates. */
  readonly isRetry = signal(false);
  /** The retry queue (#49, see `cram-queue.ts`): misses waiting to be
   *  re-served. Cleared on `start()` and `end()`. */
  private queue: CramQueueEntry[] = [];
  /** Exercises served this session, retries included — the unit `queue`'s
   *  `dueAt` is measured in. */
  private served = 0;
  /** How many times the exercise currently on screen has been served
   *  before now (`0` for a first attempt) — `queue` no longer holds this
   *  exercise's entry while it's being answered, so `submit()` can't read
   *  it back from there on a miss. */
  private currentAttempts = 0;

  /** Word ids served this session, most recent last, capped at
   *  `MAX_RECENT_WORDS` — sent as `recent_word_ids` so the backend's word
   *  pick avoids repeats without an `attempts` table to read from. */
  private recentWordIds: number[] = [];

  /** The session's own accuracy — same hanko rule as Practice (see
   *  `PracticeComponent.sessionAccuracy`), just never fed back into Elo. */
  private readonly sessionAccuracy = computed(() => {
    const answered = this.answered();
    return answered > 0 ? this.correct() / answered : 0;
  });

  readonly hankoCharacters = computed(() => (this.sessionAccuracy() >= 0.8 ? '合格' : '練習'));
  readonly hankoLabel = computed(() => (this.sessionAccuracy() >= 0.8 ? 'Passed' : 'Practice'));

  constructor() {
    // The route param is the single source of truth: a change — even one
    // typed while a session is running — reloads the form and resets
    // straight back to its gate.
    effect(() => {
      this.loadForm(this.formKey());
    });
  }

  retryFormLoad(): void {
    this.loadForm(this.formKey());
  }

  start(): void {
    this.answered.set(0);
    this.correct.set(0);
    this.retried.set(0);
    this.retriedCorrect.set(0);
    this.loadFailed.set(false);
    this.recentWordIds = [];
    this.queue = [];
    this.served = 0;
    this.sessionStartedAt = Date.now();
    this.next();
  }

  end(): void {
    this.sessionDurationMs.set(Date.now() - this.sessionStartedAt);
    this.phase.set(this.answered() ? 'ended' : 'idle');
    this.exercise.set(null);
    this.result.set(null);
    this.queue = [];
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

  /** Alt+H: reveal the solution, scored as a plain miss (never written —
   *  see `app/cram.py`). */
  onGaveUpRequested(event: { timeMs: number }): void {
    this.submit('', event.timeMs, true);
  }

  private loadForm(formKey: string): void {
    this.form.set(null);
    this.formNotFound.set(false);
    this.formLoadFailed.set(false);
    this.phase.set('idle');
    this.exercise.set(null);
    this.result.set(null);
    this.answered.set(0);
    this.correct.set(0);
    this.retried.set(0);
    this.retriedCorrect.set(0);
    this.recentWordIds = [];
    this.queue = [];
    this.served = 0;

    this.api.cramForm(formKey).subscribe({
      next: (form) => this.form.set(form),
      error: (err: HttpErrorResponse) => {
        if (err.status === 404) {
          this.formNotFound.set(true);
        } else {
          this.formLoadFailed.set(true);
        }
      },
    });
  }

  private next(): void {
    this.result.set(null);
    this.gaveUp.set(false);

    const due = takeCramRetry(this.queue, this.served);
    this.queue = due.queue;
    this.isRetry.set(due.entry !== null);
    this.currentAttempts = due.entry?.attempts ?? 0;

    const request = due.entry
      ? this.api.cramNext(this.formKey(), this.recentWordIds, {
          practice_item_id: due.entry.practiceItemId,
          word_id: due.entry.wordId,
        })
      : this.api.cramNext(this.formKey(), this.recentWordIds);

    request.subscribe({
      next: (exercise) => {
        this.loadFailed.set(false);
        this.rememberWord(exercise.word_id);
        this.exercise.set(exercise);
        this.phase.set('active');
        this.served++;
      },
      error: () => {
        this.loadFailed.set(true);
        this.phase.set('idle');
      },
    });
  }

  private rememberWord(wordId: number): void {
    this.recentWordIds.push(wordId);
    if (this.recentWordIds.length > MAX_RECENT_WORDS) {
      this.recentWordIds.shift();
    }
  }

  private submit(answer: string, timeMs: number, gaveUp: boolean): void {
    const exercise = this.exercise();
    if (!exercise || this.phase() !== 'active') {
      return;
    }

    this.gaveUp.set(gaveUp);
    const wasRetry = this.isRetry();

    this.api
      .cramAnswer({
        practice_item_id: exercise.practice_item_id,
        word_id: exercise.word_id,
        answer,
        time_ms: timeMs,
        gave_up: gaveUp,
      })
      .subscribe((result) => {
        this.result.set(result);
        this.phase.set('answered');

        if (wasRetry) {
          this.retried.update((n) => n + 1);
          if (result.correct) {
            this.retriedCorrect.update((n) => n + 1);
          } else {
            this.queue = scheduleCramRetry(
              this.queue, this.served, exercise.practice_item_id, exercise.word_id,
              this.currentAttempts,
            );
          }
          return;
        }

        this.answered.update((n) => n + 1);
        if (result.correct) {
          this.correct.update((n) => n + 1);
        } else {
          this.queue = scheduleCramRetry(
            this.queue, this.served, exercise.practice_item_id, exercise.word_id, 0,
          );
        }
      });
  }
}
