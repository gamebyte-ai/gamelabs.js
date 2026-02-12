import type { Unsubscribe } from "gamelabsjs";

export class DebugEvents {
  private readonly toggleGroundGridListeners = new Set<() => void>();

  onToggleGroundGrid(cb: () => void): Unsubscribe {
    this.toggleGroundGridListeners.add(cb);
    return () => {
      this.toggleGroundGridListeners.delete(cb);
    };
  }

  emitToggleGroundGrid(): void {
    for (const cb of this.toggleGroundGridListeners) cb();
  }
}

