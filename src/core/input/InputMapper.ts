import type { Unsubscribe } from "../events/subscriptions.js";
import type { IInputDeviceListener } from "./IInputDeviceListener.js";

/**
 * Maps input sources (keyboard, etc.) to named actions.
 *
 * 1. Define actions: `addButtonAction("jump", (isPressed) => { ... })`
 * 2. Bind inputs:   `mapKeyboardButton("Space", "jump")`
 *
 * Multiple keys can map to the same action. Unsubscribe to remove individual bindings.
 */
export class InputMapper {
  private readonly _deviceListeners = new Map<string, IInputDeviceListener>();
  private readonly _buttonActions = new Map<string, (isPressed: boolean) => void>();
  private readonly _directionActions = new Map<string, (x: number, y: number) => void>();

  constructor() {}

  public addDeviceListener(listener: IInputDeviceListener): void {
    this._deviceListeners.set(listener.deviceId, listener);
  }

  /** Register a named button action. */
  public addButtonAction(actionName: string, actionCallback: (isPressed: boolean) => void): void {
    this._buttonActions.set(actionName, actionCallback);
  }

  /** Register a named direction action. */
  public addDirectionAction(actionName: string, actionCallback: (x: number, y: number) => void): void {
    this._directionActions.set(actionName, actionCallback);
  }

  /** Bind a keyboard key to a named button action. Returns an unsubscribe function. */
  public mapKeyToAction(deviceId: string, code: string, actionName: string): Unsubscribe {
    const listener = this._deviceListeners.get(deviceId);
    if (!listener) throw new Error(`Device listener not found: ${deviceId}`);

    return listener.addKeyHandler(code, (isPressed) => {
      const action = this._buttonActions.get(actionName);
      if (action) action(isPressed);
    });
  }

  /**
   * Bind four keyboard keys to a named direction action.
   * Opposite keys cancel each other (e.g. left+right = x:0).
   * Emits on every key change. Returns an unsubscribe function.
   */
  public mapKeysToDirection(
    deviceId: string,
    upCode: string,
    downCode: string,
    leftCode: string,
    rightCode: string,
    actionName: string,
  ): Unsubscribe {
    const listener = this._deviceListeners.get(deviceId);
    if (!listener) throw new Error(`Device listener not found: ${deviceId}`);

    const emit = (): void => {
      const action = this._directionActions.get(actionName);
      if (!action) return;
      const x = (listener.isKeyDown(rightCode) ? 1 : 0) - (listener.isKeyDown(leftCode) ? 1 : 0);
      const y = (listener.isKeyDown(downCode) ? 1 : 0) - (listener.isKeyDown(upCode) ? 1 : 0);
      action(x, y);
    };

    const unsubs = [
      listener.addKeyHandler(upCode, emit),
      listener.addKeyHandler(downCode, emit),
      listener.addKeyHandler(leftCode, emit),
      listener.addKeyHandler(rightCode, emit),
    ];

    return () => {
      for (const u of unsubs) u();
    };
  }

  /**
   * Bind two analog axis ranges to a named direction action.
   *
   * Use for joysticks (`<id>.x` / `<id>.y`) and gamepad sticks where
   * preserving the float value matters. The action fires with the
   * device's raw normalized values (typically in `[-1, 1]`); apps
   * that want a dead zone or clamping should apply it inside the
   * action callback.
   *
   * Each axis is subscribed independently, so changes on either axis
   * fire the action with the latest pair read from `getRangeValue`.
   */
  public mapRangesToDirection(deviceId: string, xCode: string, yCode: string, actionName: string): Unsubscribe {
    const listener = this._deviceListeners.get(deviceId);
    if (!listener) throw new Error(`Device listener not found: ${deviceId}`);

    const emit = (): void => {
      const action = this._directionActions.get(actionName);
      if (!action) return;
      action(listener.getRangeValue(xCode), listener.getRangeValue(yCode));
    };

    const unsubs = [listener.addRangeHandler(xCode, emit), listener.addRangeHandler(yCode, emit)];
    return () => {
      for (const u of unsubs) u();
    };
  }
}
