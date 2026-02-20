export type Unsubscribe = () => void;

/**
 * Collects unsubscribe callbacks and flushes them safely.
 *
 * - `add()` stores an unsubscribe callback (ignores null/undefined).
 * - `flush()` calls all callbacks once (LIFO) and clears the bag.
 * - Calling `flush()` multiple times is safe (idempotent after first flush).
 */
export class UnsubscribeBag {
  private unsubs: Unsubscribe[] = [];

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
      } catch {
        // Best-effort cleanup: keep flushing remaining callbacks.
      }
    }
  }
}

