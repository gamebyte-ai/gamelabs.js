import * as PIXI from "pixi.js";
import type { IScreenView } from "./IScreenView.js";
import type { ScreenTransition } from "./ScreenTransition.js";

/**
 * Base PixiJS screen view.
 *
 * This is a convenience implementation that:
 * - is a `PIXI.Container`
 * - implements `IScreenView`
 * - provides safe default lifecycle hooks
 * - provides a `destroy()` that detaches from parent and removes listeners
 *
 * Concrete screens can extend this and add their own children and logic.
 */
export class ScreenView extends PIXI.Container implements IScreenView {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onEnter(_transition: ScreenTransition): void | Promise<void> {
    // Default: no-op.
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onExit(_transition: ScreenTransition): void | Promise<void> {
    // Default: no-op.
  }

  override destroy(): void {
    // Prefer explicit cleanup for interactive UI.
    this.removeAllListeners();
    this.removeFromParent();
    super.destroy();
  }
}

