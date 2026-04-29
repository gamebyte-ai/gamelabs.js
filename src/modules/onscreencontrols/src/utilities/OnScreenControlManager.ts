import type { Unsubscribe } from "../../../../core/events/subscriptions.js";
import type { IInputDeviceListener } from "../../../../core/input/IInputDeviceListener.js";
import { ControlType } from "../OnScreenControlTypes.js";
import type { ControlConfig, VirtualJoystickConfig } from "../OnScreenControlTypes.js";
import { OnScreenControlEvents } from "../events/OnScreenControlEvents.js";

/**
 * Owns runtime state for every on-screen control: registered configs,
 * key down/up state, the disabled / hidden flags, the progress ring
 * value/visibility, and label text content. Drives the
 * `OnScreenControlsView` indirectly through `OnScreenControlEvents`,
 * and bridges to `InputMapper` via `IInputDeviceListener`.
 *
 * Virtual buttons expose their `id` as a digital key code.
 * Virtual joysticks expose two parallel surfaces:
 * - **Digital**: `<id>.up` / `<id>.down` / `<id>.left` / `<id>.right`
 *   fire as the knob crosses the configured `threshold`. Use with
 *   `InputMapper.mapKeysToDirection`.
 * - **Analog**: `<id>.x` / `<id>.y` carry the raw normalized
 *   knob position (`-1..1`). Use with `InputMapper.mapRangesToDirection`.
 *
 * Labels are display-only — no input surface. Their text content lives
 * here so the manager remains the single source of truth across
 * view rebinds; update via {@link setLabelText}.
 */
export class OnScreenControlManager implements IInputDeviceListener {
  //  FIELDS
  private readonly _controls = new Map<string, ControlConfig>();
  private readonly _keysDown = new Set<string>();
  private readonly _disabledControls = new Set<string>();
  private readonly _hiddenControls = new Set<string>();
  private readonly _progressVisible = new Set<string>();
  private readonly _progressValues = new Map<string, number>();
  private readonly _labelContents = new Map<string, string>();
  private readonly _pressedHandlers = new Set<(code: string) => void>();
  private readonly _releasedHandlers = new Set<(code: string) => void>();
  private readonly _keyHandlers = new Map<string, Set<(isPressed: boolean) => void>>();
  private readonly _rangeValues = new Map<string, number>();
  private readonly _rangeChangedHandlers = new Set<(code: string, value: number) => void>();
  private readonly _rangeHandlers = new Map<string, Set<(value: number) => void>>();
  private readonly _events = new OnScreenControlEvents();

  /** Event bus for view + app subscribers. */
  public get events(): OnScreenControlEvents {
    return this._events;
  }

  //  PROPERTIES
  /** `IInputDeviceListener` device id — always `"onscreen"`. */
  public get deviceId(): string {
    return "onscreen";
  }

  //  CONTROL MANAGEMENT
  /**
   * Registers a control. Replacing an existing id silently overwrites
   * the previous config; the view will re-render the control with the
   * new visuals. Emits `events.onControlAdded`.
   */
  public addControl(config: ControlConfig): void {
    this._controls.set(config.id, config);
    if (config.type === ControlType.Label) {
      this._labelContents.set(config.id, config.content);
    }
    this._events.emitControlAdded(config);
  }

  /**
   * Removes a control by id. Releases any in-flight key/range state,
   * clears disabled / progress flags, and emits
   * `events.onControlRemoved`. No-op for unknown ids.
   */
  public removeControl(id: string): void {
    const config = this._controls.get(id);
    if (!config) return;

    if (config.type === ControlType.Joystick) {
      this._updateVirtualKey(`${id}.up`, false);
      this._updateVirtualKey(`${id}.down`, false);
      this._updateVirtualKey(`${id}.left`, false);
      this._updateVirtualKey(`${id}.right`, false);
      this._updateRange(`${id}.x`, 0);
      this._updateRange(`${id}.y`, 0);
      this._rangeValues.delete(`${id}.x`);
      this._rangeValues.delete(`${id}.y`);
    } else if (config.type === ControlType.Button) {
      this.setButtonUp(id);
    }
    // Labels have no input state to release.

    this._controls.delete(id);
    this._disabledControls.delete(id);
    this._hiddenControls.delete(id);
    this._progressVisible.delete(id);
    this._progressValues.delete(id);
    this._labelContents.delete(id);
    this._events.emitControlRemoved(id);
  }

  /**
   * Toggles a control between its enabled and disabled state.
   * - **Buttons**: render with the `disabled` visual, ignore pointer
   *   presses, force-release if they were currently held down.
   * - **Joysticks**: dim base + knob to half their configured alpha,
   *   ignore pointer drag, reset the knob to centre, and force a
   *   `(0, 0)` direction emission (clears any held virtual keys + the
   *   `<id>.x` / `<id>.y` ranges).
   * - **Labels**: dim to half alpha. No input cleanup needed.
   *
   * Visibility and enabled are independent — disabling a hidden control
   * just updates the latent state. No-op for unknown ids.
   */
  public setControlEnabled(id: string, enabled: boolean): void {
    const config = this._controls.get(id);
    if (!config) return;
    const currentlyDisabled = this._disabledControls.has(id);
    if (enabled === !currentlyDisabled) return;
    if (enabled) this._disabledControls.delete(id);
    else {
      this._disabledControls.add(id);
      // Drop any in-flight input so the new disabled visual reflects
      // the resting state and apps don't see a stuck `down` keystate
      // or a frozen joystick direction.
      if (config.type === ControlType.Button) {
        if (this._keysDown.has(id)) this.setButtonUp(id);
      } else if (config.type === ControlType.Joystick) {
        // resetJoystick fires `(0, 0)` through the existing pipeline,
        // releasing virtual keys and zeroing the analog ranges.
        this.resetJoystick(id);
      }
      // Labels: no input state to flush.
    }
    this._events.emitControlEnabledChanged(id, enabled);
  }

  /** True iff the control is enabled (the default). Returns true for unknown ids. */
  public isControlEnabled(id: string): boolean {
    return !this._disabledControls.has(id);
  }

  /**
   * Shows or hides a control. Hidden controls don't render and don't
   * receive input; their enabled / progress state is preserved across
   * hide/show cycles. Hiding a control with an in-flight press / drag
   * force-releases it (same semantics as disabling).
   *
   * No-op for unknown ids.
   */
  public setControlVisible(id: string, visible: boolean): void {
    const config = this._controls.get(id);
    if (!config) return;
    const currentlyHidden = this._hiddenControls.has(id);
    if (visible === !currentlyHidden) return;
    if (visible) this._hiddenControls.delete(id);
    else {
      this._hiddenControls.add(id);
      if (config.type === ControlType.Button) {
        if (this._keysDown.has(id)) this.setButtonUp(id);
      } else if (config.type === ControlType.Joystick) {
        this.resetJoystick(id);
      }
      // Labels: no input state to flush.
    }
    this._events.emitControlVisibilityChanged(id, visible);
  }

  /** True iff the control is currently visible (the default). Returns true for unknown ids. */
  public isControlVisible(id: string): boolean {
    return !this._hiddenControls.has(id);
  }

  /**
   * Shows the button's circular progress ring. Initial value is 0
   * unless `setButtonProgress` was called earlier. No-op for non-button
   * controls or unknown ids.
   */
  public showButtonProgress(id: string): void {
    const config = this._controls.get(id);
    if (!config || config.type !== ControlType.Button) return;
    if (this._progressVisible.has(id)) return;
    this._progressVisible.add(id);
    this._events.emitButtonProgressVisibilityChanged(id, true);
  }

  /** Hides the button's circular progress ring. Value is preserved across show/hide cycles. */
  public hideButtonProgress(id: string): void {
    if (!this._progressVisible.has(id)) return;
    this._progressVisible.delete(id);
    this._events.emitButtonProgressVisibilityChanged(id, false);
  }

  /** True iff the button's progress ring is currently shown. */
  public isButtonProgressVisible(id: string): boolean {
    return this._progressVisible.has(id);
  }

  /**
   * Sets the progress value (0..1) for a button's ring. The ring
   * sweeps clockwise from 12 o'clock; `t = 0` is empty, `t = 1` is a
   * full circle. Out-of-range values are clamped. No-op for non-button
   * controls or unknown ids.
   */
  public setButtonProgress(id: string, t: number): void {
    const config = this._controls.get(id);
    if (!config || config.type !== ControlType.Button) return;
    const clamped = Math.max(0, Math.min(1, t));
    if (this._progressValues.get(id) === clamped) return;
    this._progressValues.set(id, clamped);
    this._events.emitButtonProgressChanged(id, clamped);
  }

  /** Last set progress value (0 if never set or after `removeControl`). */
  public getButtonProgress(id: string): number {
    return this._progressValues.get(id) ?? 0;
  }

  /**
   * Updates a label's displayed text. The view re-renders on the next
   * frame and (if the label has a bg sprite) the bg auto-resizes to
   * match the new bounds. No-op for non-label controls, unknown ids,
   * or unchanged values.
   */
  public setLabelText(id: string, value: string): void {
    const config = this._controls.get(id);
    if (!config || config.type !== ControlType.Label) return;
    if (this._labelContents.get(id) === value) return;
    this._labelContents.set(id, value);
    this._events.emitLabelTextChanged(id, value);
  }

  /** Current label text (`""` if never set or for non-label ids). */
  public getLabelText(id: string): string {
    return this._labelContents.get(id) ?? "";
  }

  /** Returns the registered config, or `undefined` if not registered. */
  public getControl(id: string): ControlConfig | undefined {
    return this._controls.get(id);
  }

  /** Iterates every registered control config, in insertion order. */
  public getControls(): Iterable<ControlConfig> {
    return this._controls.values();
  }

  //  BUTTON STATE — primarily called by the view's pointer handlers,
  //  but apps can also drive buttons programmatically (e.g., to wire a
  //  keyboard shortcut to the same on-screen button id).
  /**
   * Reports a button as pressed. Fires `keyPressed` / per-key handlers.
   * Silently no-ops if the button is disabled, hidden, or already down.
   */
  public setButtonDown(id: string): void {
    if (this._disabledControls.has(id)) return;
    if (this._hiddenControls.has(id)) return;
    if (!this._keysDown.has(id)) {
      this._keysDown.add(id);
      for (const cb of this._pressedHandlers) cb(id);
      const handlers = this._keyHandlers.get(id);
      if (handlers) for (const cb of handlers) cb(true);
    }
  }

  /** Reports a button as released. No-op if it wasn't down. */
  public setButtonUp(id: string): void {
    if (this._keysDown.has(id)) {
      this._keysDown.delete(id);
      for (const cb of this._releasedHandlers) cb(id);
      const handlers = this._keyHandlers.get(id);
      if (handlers) for (const cb of handlers) cb(false);
    }
  }

  //  JOYSTICK STATE — primarily called by the view's pointer handlers.
  /**
   * Reports a joystick's normalized knob position. `nx` / `ny` are
   * typically in `[-1, 1]` (the view clamps to the unit circle).
   * Fires both pipelines:
   * - **Digital**: virtual key press/release on the four cardinal
   *   axes once the knob crosses the configured threshold.
   * - **Analog**: range mutations on `<id>.x` / `<id>.y` with the raw
   *   normalized values (consumed by `mapRangesToDirection`).
   *
   * No-op for unknown ids, non-joystick controls, or while the
   * joystick is disabled / hidden — except that the framework's own
   * forced-release path (via `resetJoystick(id)` from
   * `setControlEnabled` / `setControlVisible`) bypasses these gates so
   * the zero direction can flush downstream state.
   */
  public setJoystickDirection(id: string, nx: number, ny: number): void {
    const config = this._controls.get(id);
    if (!config || config.type !== ControlType.Joystick) return;
    // Block live drag while disabled / hidden. `resetJoystick` calls
    // through here too, but it always passes (0, 0) — and on the first
    // call after the gate flips, the previous range will already have
    // been zeroed by the disable / hide path, so further (0, 0) updates
    // are no-ops via the equality check inside `_updateRange`.
    if (this._disabledControls.has(id) && (nx !== 0 || ny !== 0)) return;
    if (this._hiddenControls.has(id) && (nx !== 0 || ny !== 0)) return;
    const threshold = (config as VirtualJoystickConfig).threshold ?? 0.3;

    this._updateVirtualKey(`${id}.left`, nx < -threshold);
    this._updateVirtualKey(`${id}.right`, nx > threshold);
    this._updateVirtualKey(`${id}.up`, ny < -threshold);
    this._updateVirtualKey(`${id}.down`, ny > threshold);

    this._updateRange(`${id}.x`, nx);
    this._updateRange(`${id}.y`, ny);
  }

  /** Snaps the joystick back to its centre, clearing any held direction. */
  public resetJoystick(id: string): void {
    this.setJoystickDirection(id, 0, 0);
  }

  //  IInputDeviceListener — key surface
  public isKeyDown(code: string): boolean {
    return this._keysDown.has(code);
  }

  public addKeyPressedHandler(cb: (code: string) => void): Unsubscribe {
    this._pressedHandlers.add(cb);
    return () => this._pressedHandlers.delete(cb);
  }

  public addKeyReleasedHandler(cb: (code: string) => void): Unsubscribe {
    this._releasedHandlers.add(cb);
    return () => this._releasedHandlers.delete(cb);
  }

  public addKeyHandler(code: string, cb: (isPressed: boolean) => void): Unsubscribe {
    let handlers = this._keyHandlers.get(code);
    if (!handlers) {
      handlers = new Set();
      this._keyHandlers.set(code, handlers);
    }
    handlers.add(cb);
    return () => {
      handlers!.delete(cb);
      if (handlers!.size === 0) this._keyHandlers.delete(code);
    };
  }

  //  IInputDeviceListener — range surface (joystick axes)
  public getRangeValue(code: string): number {
    return this._rangeValues.get(code) ?? 0;
  }

  public addRangeChangedHandler(cb: (code: string, value: number) => void): Unsubscribe {
    this._rangeChangedHandlers.add(cb);
    return () => this._rangeChangedHandlers.delete(cb);
  }

  public addRangeHandler(code: string, cb: (value: number) => void): Unsubscribe {
    let handlers = this._rangeHandlers.get(code);
    if (!handlers) {
      handlers = new Set();
      this._rangeHandlers.set(code, handlers);
    }
    handlers.add(cb);
    return () => {
      handlers!.delete(cb);
      if (handlers!.size === 0) this._rangeHandlers.delete(code);
    };
  }

  //  PRIVATE
  private _updateRange(code: string, value: number): void {
    const previous = this._rangeValues.get(code) ?? 0;
    if (previous === value) return;
    this._rangeValues.set(code, value);
    for (const cb of this._rangeChangedHandlers) cb(code, value);
    const handlers = this._rangeHandlers.get(code);
    if (handlers) for (const cb of handlers) cb(value);
  }

  private _updateVirtualKey(code: string, isDown: boolean): void {
    if (isDown && !this._keysDown.has(code)) {
      this._keysDown.add(code);
      for (const cb of this._pressedHandlers) cb(code);
      const handlers = this._keyHandlers.get(code);
      if (handlers) for (const cb of handlers) cb(true);
    } else if (!isDown && this._keysDown.has(code)) {
      this._keysDown.delete(code);
      for (const cb of this._releasedHandlers) cb(code);
      const handlers = this._keyHandlers.get(code);
      if (handlers) for (const cb of handlers) cb(false);
    }
  }
}
