import type { WorldViewBase } from "./WorldViewBase";

export interface IWorld {
  addView(view: WorldViewBase): void;
  removeView(view: WorldViewBase): void;
}
