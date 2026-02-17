import type { Unsubscribe } from "gamelabsjs";

/**
 * Example02 app-level events originating from `LevelProgressScreenView`.
 */
export class LevelProgressScreenEvents {
  private readonly currentLevelClickListeners = new Set<() => void>();
  private readonly backClickListeners = new Set<() => void>();

  onCurrentLevelClick(cb: () => void): Unsubscribe {
    this.currentLevelClickListeners.add(cb);
    return () => {
      this.currentLevelClickListeners.delete(cb);
    };
  }

  emitCurrentLevelClick(): void {
    for (const cb of this.currentLevelClickListeners) cb();
  }

  onBackClick(cb: () => void): Unsubscribe {
    this.backClickListeners.add(cb);
    return () => {
      this.backClickListeners.delete(cb);
    };
  }

  emitBackClick(): void {
    for (const cb of this.backClickListeners) cb();
  }
}

