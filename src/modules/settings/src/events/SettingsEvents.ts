import type { Unsubscribe } from "../../../../core/events/subscriptions.js";

export class SettingsEvents {
  private readonly _valueChangedListeners = new Set<(name: string) => void>();

  onValueChanged(cb: (name: string) => void): Unsubscribe {
    this._valueChangedListeners.add(cb);
    return () => this._valueChangedListeners.delete(cb);
  }

  emitValueChanged(name: string): void {
    for (const cb of this._valueChangedListeners) cb(name);
  }
}
