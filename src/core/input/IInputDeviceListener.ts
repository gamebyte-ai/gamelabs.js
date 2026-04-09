import { Unsubscribe } from "../events/subscriptions";


export interface IInputDeviceListener
{
    //  PROPERTIES
    get deviceId(): string;

    //  METHODS
    isKeyDown(code: string): boolean;
    addKeyPressedHandler(cb: (code: string) => void): Unsubscribe;
    addKeyReleasedHandler(cb: (code: string) => void): Unsubscribe;
    addKeyHandler(code: string, cb: (isPressed: boolean) => void): Unsubscribe;
}