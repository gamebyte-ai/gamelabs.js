import type { Unsubscribe } from "../events/subscriptions.js";
import type { IInputDeviceListener } from "./IInputDeviceListener.js";

/**
 * Tracks keyboard state and dispatches press/release callbacks.
 *
 * - `isKeyDown(code)` returns whether a key is currently held.
 * - `addKeyPressedHandler(cb)` registers a callback for key-down events.
 * - `addKeyReleasedHandler(cb)` registers a callback for key-up events.
 * - Call `startListening()` / `stopListening()` to attach/detach from the DOM.
 */
export class KeyboardListener implements IInputDeviceListener {
  //  FIELDS
  private readonly _keysDown = new Set<string>();
  private readonly _pressedHandlers = new Set<(code: string) => void>();
  private readonly _releasedHandlers = new Set<(code: string) => void>();
  private readonly _keyHandlers = new Map<string, Set<(isPressed: boolean) => void>>();
  private _listening = false;

  private readonly _onKeyDown = (e: KeyboardEvent): void => {
    const code = e.code;
    if (!this._keysDown.has(code)) {
      this._keysDown.add(code);
      for (const cb of this._pressedHandlers) cb(code);
      const handlers = this._keyHandlers.get(code);
      if (handlers) for (const cb of handlers) cb(true);
    }
  };

  private readonly _onKeyUp = (e: KeyboardEvent): void => {
    const code = e.code;
    if (this._keysDown.has(code)) {
      this._keysDown.delete(code);
      for (const cb of this._releasedHandlers) cb(code);
      const handlers = this._keyHandlers.get(code);
      if (handlers) for (const cb of handlers) cb(false);
    }
  };

  private readonly _onBlur = (): void => this._clearAllKeys();

  private readonly _onVisibilityChange = (): void => {
    if (document.hidden) this._clearAllKeys();
  };

  private _clearAllKeys(): void {
    if (this._keysDown.size === 0) return;
    // Snapshot before firing — release handlers may mutate _keysDown.
    const codes = Array.from(this._keysDown);
    this._keysDown.clear();
    for (const code of codes) {
      for (const cb of this._releasedHandlers) cb(code);
      const handlers = this._keyHandlers.get(code);
      if (handlers) for (const cb of handlers) cb(false);
    }
  }

  //  PROPERTIES
  public get deviceId(): string {
    return "keyboard";
  }

  //  METHODS
  /** Returns true if the key with the given code is currently held down. */
  public isKeyDown(code: string): boolean {
    return this._keysDown.has(code);
  }

  /** Register a callback invoked when a key is pressed. Returns an unsubscribe function. */
  public addKeyPressedHandler(cb: (code: string) => void): Unsubscribe {
    this._pressedHandlers.add(cb);
    return () => this._pressedHandlers.delete(cb);
  }

  /** Register a callback invoked when a key is released. Returns an unsubscribe function. */
  public addKeyReleasedHandler(cb: (code: string) => void): Unsubscribe {
    this._releasedHandlers.add(cb);
    return () => this._releasedHandlers.delete(cb);
  }

  /** Register a callback for a specific key. Called with `true` on press, `false` on release. */
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

  // Keyboards have no continuous-axis inputs. The range API is implemented
  // as no-ops so the device satisfies `IInputDeviceListener` and apps can
  // wire range mappings against any device without an instanceof check.
  public getRangeValue(_code: string): number {
    return 0;
  }

  public addRangeChangedHandler(_cb: (code: string, value: number) => void): Unsubscribe {
    return () => {};
  }

  public addRangeHandler(_code: string, _cb: (value: number) => void): Unsubscribe {
    return () => {};
  }

  /** Start listening to keyboard events on the window. */
  public startListening(): void {
    if (this._listening) return;
    this._listening = true;
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("blur", this._onBlur);
    document.addEventListener("visibilitychange", this._onVisibilityChange);
  }

  /** Stop listening and clear all held-key state. */
  public stopListening(): void {
    if (!this._listening) return;
    this._listening = false;
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("blur", this._onBlur);
    document.removeEventListener("visibilitychange", this._onVisibilityChange);
    this._keysDown.clear();
  }
}
