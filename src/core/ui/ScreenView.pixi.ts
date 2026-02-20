import "@pixi/layout";
import type { IView } from "../views/IView.js";
import type { IScreen } from "./IScreen.js";
import { SCREEN_TRANSITION_TYPES, type ScreenTransition } from "./ScreenTransition.js";
import { HudViewBase } from "../views/HudViewBase.js";

/**
 * Base PixiJS screen view.
 *
 * This is a convenience implementation that:
 * - is a `PIXI.Container`
 * - implements `IView` and `IScreen`
 * - provides safe default lifecycle hooks
 * - provides a `destroy()` that detaches from parent and removes listeners
 *
 * Concrete screens can extend this and add their own children and logic.
 */
export class ScreenView extends HudViewBase implements IView, IScreen {
  private enterTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private exitTimeoutId: ReturnType<typeof setTimeout> | null = null;

  public override postInitialize(): void {
    super.postInitialize();
    // Enable layout by default for Pixi screens. Apps can override styles in subclasses.
    (this as any).layout = { width: 1, height: 1 };
  }

  onEnter(transition: ScreenTransition): void | Promise<void> {
    if (this.enterTimeoutId) {
      clearTimeout(this.enterTimeoutId);
      this.enterTimeoutId = null;
    }

    switch (transition.type) {
      case SCREEN_TRANSITION_TYPES.INSTANT: {
        if (transition.durationMs <= 0) {
          return;
        }

        this.visible = false;
        this.enterTimeoutId = setTimeout(() => {
          this.enterTimeoutId = null;
          if ((this as any).destroyed) return;
          this.visible = true;
        }, transition.durationMs);

        return;
      }

      default:
        return;
    }
  }

  onExit(transition: ScreenTransition): void | Promise<void> {
    if (this.exitTimeoutId) {
      clearTimeout(this.exitTimeoutId);
      this.exitTimeoutId = null;
    }

    switch (transition.type) {
      case SCREEN_TRANSITION_TYPES.INSTANT: {
        if (transition.durationMs <= 0) {
          this.destroy();
          return;
        }

        this.exitTimeoutId = setTimeout(() => {
          this.exitTimeoutId = null;
          if ((this as any).destroyed) return;
          this.destroy();
        }, transition.durationMs);
        return;
      }

      default:
        return;
    }
  }

  override destroy(): void {
    if (this.enterTimeoutId) {
      clearTimeout(this.enterTimeoutId);
      this.enterTimeoutId = null;
    }
    if (this.exitTimeoutId) {
      clearTimeout(this.exitTimeoutId);
      this.exitTimeoutId = null;
    }

    super.destroy();
  }

  /**
   * Optional convenience for layout-enabled screens.
   * If you don't use layouts, you can ignore this.
   */
  onResize(width: number, height: number, _dpr: number): void {
    (this as any).layout = { width: Math.max(1, width), height: Math.max(1, height) };
  }

}

