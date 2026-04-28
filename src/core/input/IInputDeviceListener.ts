import type { Unsubscribe } from "../events/subscriptions";

export interface IInputDeviceListener {
  //  PROPERTIES
  get deviceId(): string;

  //  KEYS — boolean inputs (keyboard keys, virtual buttons, joystick virtual keys past threshold)
  isKeyDown(code: string): boolean;
  addKeyPressedHandler(cb: (code: string) => void): Unsubscribe;
  addKeyReleasedHandler(cb: (code: string) => void): Unsubscribe;
  addKeyHandler(code: string, cb: (isPressed: boolean) => void): Unsubscribe;

  //  RANGES — continuous inputs (joystick axes, gamepad triggers / sticks)
  /** Current value for the range. `0` for codes the device doesn't expose. */
  getRangeValue(code: string): number;
  /** Subscribes to every range mutation on this device. */
  addRangeChangedHandler(cb: (code: string, value: number) => void): Unsubscribe;
  /** Subscribes to a specific range code. */
  addRangeHandler(code: string, cb: (value: number) => void): Unsubscribe;
}
