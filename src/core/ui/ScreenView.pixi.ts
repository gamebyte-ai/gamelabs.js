import "@pixi/layout";
import * as PIXI from "pixi.js";
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
  private _clipMask: PIXI.Graphics | null = null;
  private _clipMaskWidth = 0;
  private _clipMaskHeight = 0;
  private _clipMaskOnLayout: ((layout: any) => void) | null = null;

  private static readonly slideDeltas: Partial<Record<string, { enter: { x: number; y: number }; exit: { x: number; y: number } }>> = {
    [SCREEN_TRANSITION_TYPES.SLIDE_IN_LEFT]: { enter: { x: -1, y: 0 }, exit: { x: 1, y: 0 } },
    [SCREEN_TRANSITION_TYPES.SLIDE_IN_RIGHT]: { enter: { x: 1, y: 0 }, exit: { x: -1, y: 0 } },
    [SCREEN_TRANSITION_TYPES.SLIDE_IN_DOWN]: { enter: { x: 0, y: 1 }, exit: { x: 0, y: -1 } },
    [SCREEN_TRANSITION_TYPES.SLIDE_IN_UP]: { enter: { x: 0, y: -1 }, exit: { x: 0, y: 1 } }
  };

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

  private ensureClipMask(width: number, height: number): void {
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));

    if (!this._clipMask) {
      this._clipMask = new PIXI.Graphics();
      this._clipMask.alpha = 0;
      (this._clipMask as any).eventMode = "none";
      (this._clipMask as any).layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };
      this.addChildAt(this._clipMask, 0);
      this.mask = this._clipMask;
    }

    if (this._clipMaskWidth === w && this._clipMaskHeight === h) return;
    this._clipMaskWidth = w;
    this._clipMaskHeight = h;

    this._clipMask.clear();
    this._clipMask.rect(0, 0, w, h).fill({ color: 0xffffff });
  }

  private getTransitionViewportSize(): { width: number; height: number } {
    const layout = (this as any).layout;
    const w = typeof layout?.width === "number" ? layout.width : undefined;
    const h = typeof layout?.height === "number" ? layout.height : undefined;
    if (w && h) return { width: Math.max(1, w), height: Math.max(1, h) };

    const parentLayout = (this.parent as any)?.layout;
    const pw = typeof parentLayout?.width === "number" ? parentLayout.width : undefined;
    const ph = typeof parentLayout?.height === "number" ? parentLayout.height : undefined;
    if (pw && ph) return { width: Math.max(1, pw), height: Math.max(1, ph) };

    if (typeof window !== "undefined" && typeof window.innerWidth === "number" && typeof window.innerHeight === "number") {
      return { width: Math.max(1, window.innerWidth), height: Math.max(1, window.innerHeight) };
    }

    return { width: 1, height: 1 };
  }

  private runTransition(durationMs: number, onTick: (t: number) => void, onDone: () => void): void {
    const isDestroyed = (): boolean => Boolean((this as any).destroyed);

    if (durationMs <= 0) {
      if (!isDestroyed()) onTick(1);
      if (!isDestroyed()) onDone();
      return;
    }

    if (typeof requestAnimationFrame === "function" && typeof cancelAnimationFrame === "function") {
      const startMs = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
      const step = (nowMs: number): void => {
        if (isDestroyed()) return;
        const t = Math.min(1, Math.max(0, (nowMs - startMs) / durationMs));
        onTick(t);
        if (t >= 1) {
          this._transitionRafId = null;
          if (!isDestroyed()) onDone();
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
      onTick(t);
      if (t >= 1) {
        if (!isDestroyed()) onDone();
        return;
      }
      this.setTransitionTimeout(tick, 16);
    };
    this.setTransitionTimeout(tick, 0);
  }

  private slideInOrOut(phase: "enter" | "exit", transition: ScreenTransition): void {
    const deltas = ScreenView.slideDeltas[transition.type];
    if (!deltas) return;

    const { width, height } = this.getTransitionViewportSize();
    this.ensureClipMask(width, height);
    const baseX = this.x;
    const baseY = this.y;

    const enterDx = deltas.enter.x * width;
    const enterDy = deltas.enter.y * height;
    const exitDx = deltas.exit.x * width;
    const exitDy = deltas.exit.y * height;

    if (phase === "enter") {
      this.visible = true;
      this.alpha = 1;
      this.position.set(baseX + enterDx, baseY + enterDy);
      this.runTransition(transition.durationMs, (t) => {
        const inv = 1 - t;
        this.position.set(baseX + enterDx * inv, baseY + enterDy * inv);
      }, () => {
        if ((this as any).destroyed) return;
        this.position.set(baseX, baseY);
      });
      return;
    }

    this.runTransition(transition.durationMs, (t) => {
      this.position.set(baseX + exitDx * t, baseY + exitDy * t);
    }, () => {
      if ((this as any).destroyed) return;
      this.destroy();
    });
  }

  public override postInitialize(): void {
    super.postInitialize();
    // Enable layout by default for Pixi screens. Apps can override styles in subclasses.
    (this as any).layout = { width: 1, height: 1 };

    const onLayout = (layout: any) => {
      const w = Math.max(1, Math.floor(layout.computedLayout.width));
      const h = Math.max(1, Math.floor(layout.computedLayout.height));
      this.ensureClipMask(w, h);
    };
    this._clipMaskOnLayout = onLayout;
    this.on("layout", onLayout);
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

      case SCREEN_TRANSITION_TYPES.SLIDE_IN_LEFT:
      case SCREEN_TRANSITION_TYPES.SLIDE_IN_RIGHT:
      case SCREEN_TRANSITION_TYPES.SLIDE_IN_DOWN:
      case SCREEN_TRANSITION_TYPES.SLIDE_IN_UP: {
        this.slideInOrOut("enter", transition);
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

      case SCREEN_TRANSITION_TYPES.SLIDE_IN_LEFT:
      case SCREEN_TRANSITION_TYPES.SLIDE_IN_RIGHT:
      case SCREEN_TRANSITION_TYPES.SLIDE_IN_DOWN:
      case SCREEN_TRANSITION_TYPES.SLIDE_IN_UP: {
        this.slideInOrOut("exit", transition);
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

    if (this._clipMaskOnLayout) {
      this.off("layout", this._clipMaskOnLayout);
      this._clipMaskOnLayout = null;
    }

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

