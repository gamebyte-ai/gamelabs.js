import { InjectionToken } from "../di/InjectionToken.js";
import type { IPointerInputHandler } from "./IPointerInputHandler.js";

export interface IInputManager {
  addPointerHandler(handler: IPointerInputHandler): void;
  removePointerHandler(handler: IPointerInputHandler): void;
}

export const IInputManager = new InjectionToken<IInputManager>("IInputManager");
