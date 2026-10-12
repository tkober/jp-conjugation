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
import { SumiSessionBar, SumiSessionGate, SumiSessionSummary } from 'sumi-ui/practice';

import { ApiService } from '../../core/api.service';
import { CramExercise, CramForm, CramResult } from '../../core/models';
import { PracticeRoundComponent } from '../../shared/practice-round/practice-round.component';

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

  readonly answered = signal(0);
  readonly correct = signal(0);
  /** Set when the first `/api/cram/next` of a session fails — shows
   *  `sumi-error-state` instead of the gate until the user retries, same as
   *  Practice's T6. */
  readonly loadFailed = signal(false);
  private sessionStartedAt = 0;
  readonly sessionDurationMs = signal(0);

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
    this.loadFailed.set(false);
    this.recentWordIds = [];
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
    this.recentWordIds = [];

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
    this.api.cramNext(this.formKey(), this.recentWordIds).subscribe({
      next: (exercise) => {
        this.loadFailed.set(false);
        this.rememberWord(exercise.word_id);
        this.exercise.set(exercise);
        this.phase.set('active');
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
        this.answered.update((n) => n + 1);
        if (result.correct) {
          this.correct.update((n) => n + 1);
        }
      });
  }
}
