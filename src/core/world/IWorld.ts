import type { WorldViewBase } from "./WorldViewBase";

export interface IWorld {
  addView(view: WorldViewBase): void;
  removeView(view: WorldViewBase): void;
  resize(width: number, height: number, dpr: number): void;
  render(): void;
  destroy(): void;
}
