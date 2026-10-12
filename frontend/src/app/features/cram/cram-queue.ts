/** Cram's retry queue (#49): a missed or given-up exercise comes back after
 *  `RETRY_DELAY` other exercises, at most `MAX_ATTEMPTS` times in total, then
 *  is dropped. Pure functions over a plain array rather than a class, so the
 *  scheduling is testable without `TestBed` — `CramComponent` is the only
 *  caller and owns the array as component state.
 */

/** A miss waiting to be re-served. `dueAt` is in the same unit as
 *  `CramComponent`'s `served` counter: exercises served this session,
 *  retries included. */
export interface CramQueueEntry {
  practiceItemId: number;
  wordId: number;
  dueAt: number;
  /** How many times this pair has been served already (the original miss
   *  counts as 1) — caps the number of retries at `MAX_ATTEMPTS`. */
  attempts: number;
}

/** "after 3 other exercises" (see issue #49). */
export const RETRY_DELAY = 3;

/** "at most twice in total (miss → retry 1; miss again → retry 2; then
 *  dropped)". */
export const MAX_ATTEMPTS = 2;

/** Schedule a retry for a pair that was just missed (or given up), served
 *  `previousAttempts` times before this miss (`0` for a first-time miss,
 *  otherwise the dequeued entry's own `attempts`). Returns a new queue with
 *  the entry appended, or the queue unchanged if that was the final
 *  allowed attempt — the pair is simply dropped. */
export function scheduleCramRetry(
  queue: readonly CramQueueEntry[],
  served: number,
  practiceItemId: number,
  wordId: number,
  previousAttempts: number,
): CramQueueEntry[] {
  const attempts = previousAttempts + 1;
  if (attempts > MAX_ATTEMPTS) {
    return [...queue];
  }
  return [...queue, { practiceItemId, wordId, dueAt: served + RETRY_DELAY, attempts }];
}

/** The earliest-due entry, if any entry's `dueAt` has been reached at
 *  `served` — and the queue with that entry removed. A correct retry simply
 *  never calls `scheduleCramRetry` again, so dequeuing here is enough to
 *  drop it for good. */
export function takeCramRetry(
  queue: readonly CramQueueEntry[],
  served: number,
): { entry: CramQueueEntry | null; queue: CramQueueEntry[] } {
  if (queue.length === 0) {
    return { entry: null, queue: [] };
  }

  const earliest = queue.reduce((a, b) => (a.dueAt <= b.dueAt ? a : b));
  if (earliest.dueAt > served) {
    return { entry: null, queue: [...queue] };
  }
  return { entry: earliest, queue: queue.filter((e) => e !== earliest) };
}
