import type { IInputManager } from "../input/IInputManager.js";
import type { WorldViewBase } from "./WorldViewBase.three";
import type { IWorldPointerInput } from "./IWorldPointerInput.js";

export interface IWorld {
  /**
   * Mount a `WorldViewBase` as a root-level scene node. Child views are
   * attached to their parents via the renderer's native API
   * (`parentView.add(child)` for THREE), not through this method.
   *
   * Asymmetric on purpose: `WorldViewBase.destroy()` already calls
   * `removeFromParent()`, so manual detach via `removeRootView` is rarely
   * needed — `removeRootView` exists for completeness / parity with
   * `addRootView`, not because consumers must call it.
   */
  addRootView(view: WorldViewBase): void;
  removeRootView(view: WorldViewBase): void;
  resize(width: number, height: number, dpr: number): void;
  render(): void;
  destroy(): void;
  attachInput(inputManager: IInputManager): void;
  readonly worldPointerInput: IWorldPointerInput | null;
}
