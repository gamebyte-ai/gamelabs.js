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

  /** Start listening to keyboard events on the window. */
  public startListening(): void {
    if (this._listening) return;
    this._listening = true;
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
  }

  /** Stop listening and clear all held-key state. */
  public stopListening(): void {
    if (!this._listening) return;
    this._listening = false;
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    this._keysDown.clear();
  }
}
