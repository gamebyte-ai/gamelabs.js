import type { Unsubscribe } from "gamelabsjs";

/**
 * Example02 app-level events originating from `MainScreen`.
 */
export class MainScreenEvents {
  private readonly playClickListeners = new Set<() => void>();

  onPlayClick(cb: () => void): Unsubscribe {
    this.playClickListeners.add(cb);
    return () => {
      this.playClickListeners.delete(cb);
    };
  }

  emitPlayClick(): void {
    for (const cb of this.playClickListeners) cb();
  }
}

