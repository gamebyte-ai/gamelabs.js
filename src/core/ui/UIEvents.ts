import type { Unsubscribe } from "../events/subscriptions.js";
import type { IScreenView } from "./IScreenView.js";
import type { IPopupView } from "./IPopupView.js";
import type { ScreenTransition } from "./ScreenTransition.js";

/**
 * Core UI event bus for screen and popup navigation.
 *
 * Controllers can inject this to trigger screen changes and
 * popup management without needing direct access to ViewFactory.
 */
export class UIEvents {
  // Screen events
  private readonly createScreenListeners = new Set<(View: new () => IScreenView, transition: ScreenTransition | null) => void>();

  onCreateScreen(cb: (View: new () => IScreenView, transition: ScreenTransition | null) => void): Unsubscribe {
    this.createScreenListeners.add(cb);
    return () => { this.createScreenListeners.delete(cb); };
  }

  createScreen(View: new () => IScreenView, transition: ScreenTransition | null): void {
    for (const cb of this.createScreenListeners) cb(View, transition);
  }

  // Popup events
  private readonly createPopupListeners = new Set<(View: new () => IPopupView) => void>();
  private readonly removeTopPopupListeners = new Set<() => void>();
  private readonly removeAllPopupsListeners = new Set<() => void>();

  onCreatePopup(cb: (View: new () => IPopupView) => void): Unsubscribe {
    this.createPopupListeners.add(cb);
    return () => { this.createPopupListeners.delete(cb); };
  }

  createPopup(View: new () => IPopupView): void {
    for (const cb of this.createPopupListeners) cb(View);
  }

  onRemoveTopPopup(cb: () => void): Unsubscribe {
    this.removeTopPopupListeners.add(cb);
    return () => { this.removeTopPopupListeners.delete(cb); };
  }

  removeTopPopup(): void {
    for (const cb of this.removeTopPopupListeners) cb();
  }

  onRemoveAllPopups(cb: () => void): Unsubscribe {
    this.removeAllPopupsListeners.add(cb);
    return () => { this.removeAllPopupsListeners.delete(cb); };
  }

  removeAllPopups(): void {
    for (const cb of this.removeAllPopupsListeners) cb();
  }
}
