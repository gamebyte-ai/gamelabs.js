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
  private _transitionTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private _transitionRafId: number | null = null;

  private cancelTransitionTimers(): void {
    if (this._transitionTimeoutId) {
      clearTimeout(this._transitionTimeoutId);
      this._transitionTimeoutId = null;
    }
    if (this._transitionRafId !== null) {
      cancelAnimationFrame(this._transitionRafId);
      this._transitionRafId = null;
    }
  }

  private setTransitionTimeout(callback: () => void, delayMs: number): void {
    if (this._transitionTimeoutId) {
      clearTimeout(this._transitionTimeoutId);
      this._transitionTimeoutId = null;
    }
    this._transitionTimeoutId = setTimeout(() => {
      this._transitionTimeoutId = null;
      callback();
    }, delayMs);
  }

  public override postInitialize(): void {
    super.postInitialize();
    // Enable layout by default for Pixi screens. Apps can override styles in subclasses.
    (this as any).layout = { width: 1, height: 1 };
  }

  public onEnter(transition: ScreenTransition): void | Promise<void> {
    this.cancelTransitionTimers();

    switch (transition.type) {
      case SCREEN_TRANSITION_TYPES.INSTANT: {
        if (transition.durationMs <= 0) {
          return;
        }

        this.visible = false;
        this.setTransitionTimeout(() => {
          if ((this as any).destroyed) return;
          this.visible = true;
        }, transition.durationMs);

        return;
      }

      case SCREEN_TRANSITION_TYPES.FADE_IN: {
        this.visible = true;
        this.alpha = 0;

        if (transition.durationMs <= 0) {
          this.alpha = 1;
          return;
        }

        const durationMs = transition.durationMs;
        const isDestroyed = (): boolean => Boolean((this as any).destroyed);

        if (typeof requestAnimationFrame === "function" && typeof cancelAnimationFrame === "function") {
          const startMs = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
          const step = (nowMs: number): void => {
            if (isDestroyed()) return;
            const t = Math.min(1, Math.max(0, (nowMs - startMs) / durationMs));
            this.alpha = t;
            if (t >= 1) {
              this._transitionRafId = null;
              this.alpha = 1;
              return;
            }
            this._transitionRafId = requestAnimationFrame(step);
          };
          this._transitionRafId = requestAnimationFrame(step);
          return;
        }

        const startMs = Date.now();
        const tick = (): void => {
          if (isDestroyed()) return;
          const t = Math.min(1, Math.max(0, (Date.now() - startMs) / durationMs));
          this.alpha = t;
          if (t >= 1) {
            this.alpha = 1;
            return;
          }
          this.setTransitionTimeout(tick, 16);
        };
        this.setTransitionTimeout(tick, 0);
        return;
      }

      default:
        return;
    }
  }

  public onExit(transition: ScreenTransition): void | Promise<void> {
    this.cancelTransitionTimers();

    switch (transition.type) {
      case SCREEN_TRANSITION_TYPES.INSTANT: {
        if (transition.durationMs <= 0) {
          this.destroy();
          return;
        }

        this.setTransitionTimeout(() => {
          if ((this as any).destroyed) return;
          this.destroy();
        }, transition.durationMs);
        return;
      }

      case SCREEN_TRANSITION_TYPES.FADE_IN: {
        if (transition.durationMs <= 0) {
          this.destroy();
          return;
        }

        this.setTransitionTimeout(() => {
          if ((this as any).destroyed) return;
          this.destroy();
        }, transition.durationMs);
        return;
      }

      default:
        return;
    }
  }

  public override destroy(): void {
    this.cancelTransitionTimers();

    super.destroy();
  }

  /**
   * Optional convenience for layout-enabled screens.
   * If you don't use layouts, you can ignore this.
   */
  public onResize(width: number, height: number, _dpr: number): void {
    (this as any).layout = { width: Math.max(1, width), height: Math.max(1, height) };
  }

}

