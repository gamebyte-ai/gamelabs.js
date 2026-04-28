import type { Unsubscribe } from "../../../../core/events/subscriptions.js";
import type { ControlConfig } from "../OnScreenControlTypes.js";

/**
 * Event bus for on-screen control state changes.
 *
 * The manager mutates state and emits here; the view subscribes
 * (`OnScreenControlsViewController` does the wiring) and apps can
 * subscribe directly when they need to react to control lifecycle or
 * button state outside the view layer.
 *
 * All events fire on the manager's update path, so an `add → remove`
 * pair within the same tick produces both events.
 */
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

  private readonly _controlEnabledChangedListeners = new Set<(id: string, enabled: boolean) => void>();
  private readonly _controlVisibilityChangedListeners = new Set<(id: string, visible: boolean) => void>();

  /**
   * Fires when a control's enabled state changes. Disabled buttons
   * render with their `disabled` visual and ignore presses; disabled
   * joysticks dim, lose input, and reset to center.
   */
  onControlEnabledChanged(cb: (id: string, enabled: boolean) => void): Unsubscribe {
    this._controlEnabledChangedListeners.add(cb);
    return () => this._controlEnabledChangedListeners.delete(cb);
  }

  emitControlEnabledChanged(id: string, enabled: boolean): void {
    for (const cb of this._controlEnabledChangedListeners) cb(id, enabled);
  }

  /**
   * Fires when a control is shown or hidden. Hidden controls don't
   * render and don't receive input; their enabled / progress state is
   * preserved across hide/show cycles.
   */
  onControlVisibilityChanged(cb: (id: string, visible: boolean) => void): Unsubscribe {
    this._controlVisibilityChangedListeners.add(cb);
    return () => this._controlVisibilityChangedListeners.delete(cb);
  }

  emitControlVisibilityChanged(id: string, visible: boolean): void {
    for (const cb of this._controlVisibilityChangedListeners) cb(id, visible);
  }

  private readonly _buttonProgressVisibilityListeners = new Set<(id: string, visible: boolean) => void>();
  private readonly _buttonProgressChangedListeners = new Set<(id: string, t: number) => void>();

  /** Fires when a button's progress ring is shown or hidden. */
  onButtonProgressVisibilityChanged(cb: (id: string, visible: boolean) => void): Unsubscribe {
    this._buttonProgressVisibilityListeners.add(cb);
    return () => this._buttonProgressVisibilityListeners.delete(cb);
  }

  emitButtonProgressVisibilityChanged(id: string, visible: boolean): void {
    for (const cb of this._buttonProgressVisibilityListeners) cb(id, visible);
  }

  /** Fires whenever the progress value of a button's ring is updated. `t` is in `[0, 1]`. */
  onButtonProgressChanged(cb: (id: string, t: number) => void): Unsubscribe {
    this._buttonProgressChangedListeners.add(cb);
    return () => this._buttonProgressChangedListeners.delete(cb);
  }

  emitButtonProgressChanged(id: string, t: number): void {
    for (const cb of this._buttonProgressChangedListeners) cb(id, t);
  }
}
