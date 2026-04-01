import type { Unsubscribe } from "../events/subscriptions.js";
import type { IScreenView } from "./IScreenView.js";
import type { ScreenTransition } from "./ScreenTransition.js";

/**
 * Core UI event bus for screen navigation.
 *
 * Controllers can inject this and call `createScreen()` to trigger
 * screen changes without needing direct access to ViewFactory.
 */
export class UIEvents {
  private readonly createScreenListeners = new Set<(View: new () => IScreenView, transition: ScreenTransition | null) => void>();

  onCreateScreen(cb: (View: new () => IScreenView, transition: ScreenTransition | null) => void): Unsubscribe {
    this.createScreenListeners.add(cb);
    return () => {
      this.createScreenListeners.delete(cb);
    };
  }

  createScreen(View: new () => IScreenView, transition: ScreenTransition | null): void {
    for (const cb of this.createScreenListeners) cb(View, transition);
  }
}
