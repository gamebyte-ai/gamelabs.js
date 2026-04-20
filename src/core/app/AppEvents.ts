import type { Unsubscribe } from "../events/subscriptions.js";

/**
 * App-level event bus.
 *
 * Emits whenever app-wide state (size, focus, visibility, ...) changes.
 * Read current state from `IApp`; subscribe here to react to changes.
 */
export class AppEvents {
  private readonly _resizeListeners = new Set<(width: number, height: number, dpr: number) => void>();

  public onResize(cb: (width: number, height: number, dpr: number) => void): Unsubscribe {
    this._resizeListeners.add(cb);
    return () => this._resizeListeners.delete(cb);
  }

  public emitResize(width: number, height: number, dpr: number): void {
    for (const cb of this._resizeListeners) cb(width, height, dpr);
  }
}
