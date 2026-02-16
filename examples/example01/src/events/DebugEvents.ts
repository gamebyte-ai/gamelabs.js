import type { Unsubscribe } from "gamelabsjs";

export class DebugEvents {
  private readonly toggleGroundGridListeners = new Set<() => void>();
  private readonly toggleDebugPanelListeners = new Set<() => void>();
  private readonly toggleStatsListeners = new Set<() => void>();

  onToggleGroundGrid(cb: () => void): Unsubscribe {
    this.toggleGroundGridListeners.add(cb);
    return () => {
      this.toggleGroundGridListeners.delete(cb);
    };
  }

  emitToggleGroundGrid(): void {
    for (const cb of this.toggleGroundGridListeners) cb();
  }

  onToggleDebugPanel(cb: () => void): Unsubscribe {
    this.toggleDebugPanelListeners.add(cb);
    return () => {
      this.toggleDebugPanelListeners.delete(cb);
    };
  }

  emitToggleDebugPanel(): void {
    for (const cb of this.toggleDebugPanelListeners) cb();
  }

  onToggleStats(cb: () => void): Unsubscribe {
    this.toggleStatsListeners.add(cb);
    return () => {
      this.toggleStatsListeners.delete(cb);
    };
  }

  emitToggleStats(): void {
    for (const cb of this.toggleStatsListeners) cb();
  }
}

