import { describe, expect, it } from 'vitest';

import { CramQueueEntry, MAX_ATTEMPTS, RETRY_DELAY, scheduleCramRetry, takeCramRetry } from './cram-queue';

describe('cram-queue', () => {
  describe('scheduleCramRetry', () => {
    it('schedules the pair due RETRY_DELAY exercises from now, at attempt 1', () => {
      const queue = scheduleCramRetry([], 1, 10, 20, 0);
      expect(queue).toEqual([{ practiceItemId: 10, wordId: 20, dueAt: 1 + RETRY_DELAY, attempts: 1 }]);
    });

    it('appends to an existing queue rather than replacing it', () => {
      const existing: CramQueueEntry[] = [{ practiceItemId: 1, wordId: 2, dueAt: 9, attempts: 1 }];
      const queue = scheduleCramRetry(existing, 5, 10, 20, 0);
      expect(queue).toHaveLength(2);
      expect(queue[0]).toEqual(existing[0]);
      expect(queue[1]).toEqual({ practiceItemId: 10, wordId: 20, dueAt: 5 + RETRY_DELAY, attempts: 1 });
    });

    it('increments attempts on a second miss of the same pair', () => {
      const queue = scheduleCramRetry([], 5, 10, 20, 1);
      expect(queue).toEqual([{ practiceItemId: 10, wordId: 20, dueAt: 5 + RETRY_DELAY, attempts: 2 }]);
    });

    it('drops the pair once it has reached MAX_ATTEMPTS', () => {
      expect(MAX_ATTEMPTS).toBe(2);
      const queue = scheduleCramRetry([], 8, 10, 20, MAX_ATTEMPTS);
      expect(queue).toEqual([]);
    });

    it('does not mutate the input queue', () => {
      const existing: CramQueueEntry[] = [{ practiceItemId: 1, wordId: 2, dueAt: 9, attempts: 1 }];
      scheduleCramRetry(existing, 5, 10, 20, 0);
      expect(existing).toEqual([{ practiceItemId: 1, wordId: 2, dueAt: 9, attempts: 1 }]);
    });
  });

  describe('takeCramRetry', () => {
    it('returns null on an empty queue', () => {
      expect(takeCramRetry([], 10)).toEqual({ entry: null, queue: [] });
    });

    it('returns null when the earliest entry is not yet due', () => {
      const queue: CramQueueEntry[] = [{ practiceItemId: 1, wordId: 2, dueAt: 4, attempts: 1 }];
      const result = takeCramRetry(queue, 3);
      expect(result.entry).toBeNull();
      expect(result.queue).toEqual(queue);
    });

    it('returns and removes the entry once it is due', () => {
      const entry: CramQueueEntry = { practiceItemId: 1, wordId: 2, dueAt: 4, attempts: 1 };
      const result = takeCramRetry([entry], 4);
      expect(result.entry).toEqual(entry);
      expect(result.queue).toEqual([]);
    });

    it('picks the earliest-due entry and leaves the rest queued', () => {
      const soon: CramQueueEntry = { practiceItemId: 1, wordId: 2, dueAt: 4, attempts: 1 };
      const later: CramQueueEntry = { practiceItemId: 3, wordId: 4, dueAt: 7, attempts: 1 };
      const result = takeCramRetry([later, soon], 4);
      expect(result.entry).toEqual(soon);
      expect(result.queue).toEqual([later]);
    });

    it('does not mutate the input queue', () => {
      const queue: CramQueueEntry[] = [{ practiceItemId: 1, wordId: 2, dueAt: 4, attempts: 1 }];
      takeCramRetry(queue, 4);
      expect(queue).toHaveLength(1);
    });
  });

  describe('end-to-end scheduling (issue #49 behaviour)', () => {
    /** Mirrors `CramComponent.next()`: `served` is the count of exercises
     *  already served (so, before request #1, it is 0) — it only advances
     *  once a request actually comes back. */
    it('a miss reappears as the 4th request after it, then a second miss schedules it once more, then a third drops it', () => {
      let queue: CramQueueEntry[] = [];
      let served = 0;

      // Request #1 is served (served: 0 -> 1) and missed.
      served = 1;
      queue = scheduleCramRetry(queue, served, 100, 200, 0);

      // Requests #2, #3, #4: checked at served 1, 2, 3 — not yet due; each
      // is an ordinary exercise, so served advances by one afterwards.
      for (let i = 0; i < 3; i++) {
        const { entry, queue: remaining } = takeCramRetry(queue, served);
        expect(entry).toBeNull();
        queue = remaining;
        served++;
      }
      expect(served).toBe(4);

      // Request #5: checked at served 4 — due, with the same ids.
      const retry1 = takeCramRetry(queue, served);
      expect(retry1.entry).toEqual({ practiceItemId: 100, wordId: 200, dueAt: 4, attempts: 1 });
      queue = retry1.queue;
      expect(queue).toEqual([]);
      served++; // the retry itself is now served: served: 4 -> 5.

      // The retry is missed again: scheduled once more, due at 5 + 3 = 8.
      queue = scheduleCramRetry(queue, served, 100, 200, retry1.entry!.attempts);
      expect(queue).toEqual([{ practiceItemId: 100, wordId: 200, dueAt: 8, attempts: 2 }]);

      // Requests #6, #7, #8: checked at served 5, 6, 7 — not yet due.
      for (let i = 0; i < 3; i++) {
        const { entry, queue: remaining } = takeCramRetry(queue, served);
        expect(entry).toBeNull();
        queue = remaining;
        served++;
      }
      expect(served).toBe(8);

      // Request #9: checked at served 8 — the second retry is due.
      const retry2 = takeCramRetry(queue, served);
      expect(retry2.entry).toEqual({ practiceItemId: 100, wordId: 200, dueAt: 8, attempts: 2 });
      queue = retry2.queue;
      served++;

      // Missed a third time: dropped for good, not requeued.
      queue = scheduleCramRetry(queue, served, 100, 200, retry2.entry!.attempts);
      expect(queue).toEqual([]);
    });

    it('a correct retry is simply never rescheduled, so it never reappears', () => {
      let queue: CramQueueEntry[] = scheduleCramRetry([], 1, 100, 200, 0);

      const { entry, queue: afterTake } = takeCramRetry(queue, 4);
      expect(entry).not.toBeNull();
      queue = afterTake;

      // Correct: the caller simply does not call scheduleCramRetry again.
      expect(queue).toEqual([]);
      expect(takeCramRetry(queue, 100).entry).toBeNull();
    });
  });
});
