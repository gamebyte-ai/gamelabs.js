import type { Unsubscribe } from "../events/subscriptions.js";

export type UpdateCallback = (dtSeconds: number) => void;

type Entry = {
  order: number;
  cb: UpdateCallback;
};

/**
 * Ordered per-frame update registry.
 * Controllers (or other logic objects) can register update callbacks.
 */
export class UpdateService {
  private entries: Entry[] = [];

  register(cb: UpdateCallback, order = 0): Unsubscribe {
    const entry: Entry = { cb, order };
    this.entries.push(entry);
    this.entries.sort((a, b) => a.order - b.order);

    return () => {
      this.entries = this.entries.filter((e) => e !== entry);
    };
  }

  tick(dtSeconds: number): void {
    for (const e of this.entries) e.cb(dtSeconds);
  }

  clear(): void {
    this.entries = [];
  }
}

