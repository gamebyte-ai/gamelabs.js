import type { Unsubscribe } from "../events/subscriptions.js";
import type { ScreenTransition } from "./ScreenTransition.js";

/**
 * Core UI event bus for screen and popup navigation.
 *
 * Controllers can inject this to trigger screen changes and
 * popup management using string IDs without needing direct
 * access to ViewFactory or concrete view classes.
 */
export class UIEvents {
  // Screen events
  private readonly createScreenListeners = new Set<(id: string, transition: ScreenTransition | null) => void>();

  onCreateScreen(cb: (id: string, transition: ScreenTransition | null) => void): Unsubscribe {
    this.createScreenListeners.add(cb);
    return () => {
      this.createScreenListeners.delete(cb);
    };
  }

  createScreen(id: string, transition: ScreenTransition | null): void {
    for (const cb of this.createScreenListeners) cb(id, transition);
  }

  // Popup events
  private readonly createPopupListeners = new Set<(id: string) => void>();
  private readonly removeTopPopupListeners = new Set<() => void>();
  private readonly removeAllPopupsListeners = new Set<() => void>();

  onCreatePopup(cb: (id: string) => void): Unsubscribe {
    this.createPopupListeners.add(cb);
    return () => {
      this.createPopupListeners.delete(cb);
    };
  }

  createPopup(id: string): void {
    for (const cb of this.createPopupListeners) cb(id);
  }

  onRemoveTopPopup(cb: () => void): Unsubscribe {
    this.removeTopPopupListeners.add(cb);
    return () => {
      this.removeTopPopupListeners.delete(cb);
    };
  }

  removeTopPopup(): void {
    for (const cb of this.removeTopPopupListeners) cb();
  }

  onRemoveAllPopups(cb: () => void): Unsubscribe {
    this.removeAllPopupsListeners.add(cb);
    return () => {
      this.removeAllPopupsListeners.delete(cb);
    };
  }

  removeAllPopups(): void {
    for (const cb of this.removeAllPopupsListeners) cb();
  }
}
