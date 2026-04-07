import type { Unsubscribe } from "../../../../core/events/subscriptions.js";
import type { ControlConfig } from "../OnScreenControlTypes.js";

export class OnScreenControlEvents {
  private readonly _controlAddedListeners = new Set<(config: ControlConfig) => void>();
  private readonly _controlRemovedListeners = new Set<(id: string) => void>();

  onControlAdded(cb: (config: ControlConfig) => void): Unsubscribe {
    this._controlAddedListeners.add(cb);
    return () => this._controlAddedListeners.delete(cb);
  }

  emitControlAdded(config: ControlConfig): void {
    for (const cb of this._controlAddedListeners) cb(config);
  }

  onControlRemoved(cb: (id: string) => void): Unsubscribe {
    this._controlRemovedListeners.add(cb);
    return () => this._controlRemovedListeners.delete(cb);
  }

  emitControlRemoved(id: string): void {
    for (const cb of this._controlRemovedListeners) cb(id);
  }
}
