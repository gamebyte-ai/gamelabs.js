import type { Unsubscribe } from "../../../../core/events/subscriptions.js";

/**
 * Example02 app-level events originating from `MainScreenView`.
 */
export class MainScreenEvents {
  private readonly playClickListeners = new Set<() => void>();
  private readonly settingsClickListeners = new Set<() => void>();

  onPlayClick(cb: () => void): Unsubscribe {
    this.playClickListeners.add(cb);
    return () => {
      this.playClickListeners.delete(cb);
    };
  }

  emitPlayClick(): void {
    for (const cb of this.playClickListeners) cb();
  }

  onSettingsClick(cb: () => void): Unsubscribe {
    this.settingsClickListeners.add(cb);
    return () => {
      this.settingsClickListeners.delete(cb);
    };
  }

  emitSettingsClick(): void {
    for (const cb of this.settingsClickListeners) cb();
  }
}

