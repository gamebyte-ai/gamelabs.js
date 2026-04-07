import type { Unsubscribe } from "../../../../core/events/subscriptions.js";
import type { IInputDeviceListener } from "../../../../core/input/IInputDeviceListener.js";
import { ControlType } from "../OnScreenControlTypes.js";
import type { ControlConfig, VirtualJoystickConfig } from "../OnScreenControlTypes.js";
import { OnScreenControlEvents } from "../events/OnScreenControlEvents.js";

/**
 * Stores control configurations and their runtime state.
 * Implements IInputDeviceListener so it can be registered with InputMapper.
 *
 * Virtual buttons expose their id as a key code (pressed/released).
 * Virtual joysticks expose 4 virtual key codes: `<id>.up`, `<id>.down`, `<id>.left`, `<id>.right`.
 */
export class OnScreenControlManager implements IInputDeviceListener {
  //  FIELDS
  private readonly _controls = new Map<string, ControlConfig>();
  private readonly _keysDown = new Set<string>();
  private readonly _pressedHandlers = new Set<(code: string) => void>();
  private readonly _releasedHandlers = new Set<(code: string) => void>();
  private readonly _keyHandlers = new Map<string, Set<(isPressed: boolean) => void>>();
  public readonly events = new OnScreenControlEvents();

  //  PROPERTIES
  public get deviceId(): string {
    return "onscreen";
  }

  //  CONTROL MANAGEMENT
  public addControl(config: ControlConfig): void {
    this._controls.set(config.id, config);
    this.events.emitControlAdded(config);
  }

  public removeControl(id: string): void {
    if (!this._controls.has(id)) return;
    this._controls.delete(id);
    this.events.emitControlRemoved(id);
  }

  public getControl(id: string): ControlConfig | undefined {
    return this._controls.get(id);
  }

  public getControls(): Iterable<ControlConfig> {
    return this._controls.values();
  }

  //  BUTTON STATE (called by controller/view)
  public setButtonDown(id: string): void {
    if (!this._keysDown.has(id)) {
      this._keysDown.add(id);
      for (const cb of this._pressedHandlers) cb(id);
      const handlers = this._keyHandlers.get(id);
      if (handlers) for (const cb of handlers) cb(true);
    }
  }

  public setButtonUp(id: string): void {
    if (this._keysDown.has(id)) {
      this._keysDown.delete(id);
      for (const cb of this._releasedHandlers) cb(id);
      const handlers = this._keyHandlers.get(id);
      if (handlers) for (const cb of handlers) cb(false);
    }
  }

  //  JOYSTICK STATE (called by controller/view)
  /**
   * Update joystick direction. `nx` and `ny` are normalized (-1..1).
   * Fires virtual key press/release based on threshold.
   */
  public setJoystickDirection(id: string, nx: number, ny: number): void {
    const config = this._controls.get(id);
    if (!config || config.type !== ControlType.Joystick) return;
    const threshold = (config as VirtualJoystickConfig).threshold ?? 0.3;

    this._updateVirtualKey(`${id}.left`, nx < -threshold);
    this._updateVirtualKey(`${id}.right`, nx > threshold);
    this._updateVirtualKey(`${id}.up`, ny < -threshold);
    this._updateVirtualKey(`${id}.down`, ny > threshold);
  }

  public resetJoystick(id: string): void {
    this.setJoystickDirection(id, 0, 0);
  }

  //  IInputDeviceListener
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

  //  PRIVATE
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
