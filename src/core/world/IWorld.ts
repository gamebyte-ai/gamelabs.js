import type { IInputManager } from "../input/IInputManager.js";
import type { WorldViewBase } from "./WorldViewBase.three";
import type { IWorldPointerInput } from "./IWorldPointerInput.js";

export interface IWorld {
  addView(view: WorldViewBase): void;
  removeView(view: WorldViewBase): void;
  resize(width: number, height: number, dpr: number): void;
  render(): void;
  destroy(): void;
  attachInput(inputManager: IInputManager): void;
  readonly worldPointerInput: IWorldPointerInput | null;
}
