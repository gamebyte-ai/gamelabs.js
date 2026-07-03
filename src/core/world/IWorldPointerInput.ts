import { InjectionToken } from "../di/InjectionToken.js";
import type { IPointerInputHandler } from "../input/IPointerInputHandler.js";

/**
 * Receives pointer events from the base `InputManager`, runs a raycast
 * against the World scene graph, and dispatches the result to registered
 * `WorldInteractiveObject` handlers. Lives in the World family so that
 * a renderer-free build can omit it entirely.
 */
export interface IWorldPointerInput {
  addPointerHandler(handler: IPointerInputHandler): void;
  removePointerHandler(handler: IPointerInputHandler): void;
}

export const IWorldPointerInput = new InjectionToken<IWorldPointerInput>("IWorldPointerInput");
