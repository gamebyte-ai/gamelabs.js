export type Unsubscribe = () => void;

/**
 * Optional handler invoked when a callback throws inside `flush()`.
 * Receives the thrown value. Errors thrown by the handler itself are
 * swallowed so flush always finishes.
 */
export type UnsubscribeBagErrorHandler = (error: unknown) => void;

/**
 * Collects unsubscribe callbacks and flushes them safely.
 *
 * - `add()` stores an unsubscribe callback (ignores null/undefined).
 * - `flush()` calls all callbacks once (LIFO) and clears the bag.
 * - Calling `flush()` multiple times is safe (idempotent after first flush).
 * - If a callback throws, flush continues with the rest. Pass an `onError`
 *   handler to the constructor to surface those errors (e.g. log them);
 *   without one, errors stay silent for resilience.
 */
export class UnsubscribeBag {
  private unsubs: Unsubscribe[] = [];
  private readonly onError: UnsubscribeBagErrorHandler | undefined;

  constructor(onError?: UnsubscribeBagErrorHandler) {
    this.onError = onError;
  }

  add(unsub: Unsubscribe | null | undefined): Unsubscribe {
    if (!unsub) return () => {};
    this.unsubs.push(unsub);
    return unsub;
  }

  flush(): void {
    const list = this.unsubs;
    this.unsubs = [];

    for (let i = list.length - 1; i >= 0; i--) {
      try {
        const unsub = list[i];
        if (unsub) unsub();
      } catch (err) {
        // Best-effort cleanup: keep flushing remaining callbacks.
        // Surface the error via onError if provided; without a handler,
        // the error stays silent (preserving prior resilient behavior).
        if (this.onError) {
          try {
            this.onError(err);
          } catch {
            // onError must not break flush — swallow its errors too.
          }
        }
      }
    }
  }
}
