import * as PIXI from "pixi.js";
import type { IScreenView } from "./IScreenView.js";
import { SCREEN_TRANSITION_TYPES, type ScreenTransition } from "./ScreenTransition.js";
import { HudViewBase } from "../hud/HudViewBase.js";

/**
 * Base PixiJS screen view.
 *
 * This is a convenience implementation that:
 * - is a `PIXI.Container`
 * - implements `IScreenView` (extends `IView`)
 * - provides safe default lifecycle hooks
 * - provides a `destroy()` that detaches from parent and removes listeners
 *
 * Does not itself use `@pixi/layout`. Subclasses that need layout for
 * their content can set `this.layout = { ... }` themselves (typically
 * in an `onResize` override for pixel-sized layouts).
 *
 * Concrete screens can extend this and add their own children and logic.
 */
export class ScreenView extends HudViewBase implements IScreenView {
  private _isInTransition = false;
  private _transitionTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private _transitionRafId: number | null = null;
  private _clipMask: PIXI.Graphics | null = null;
  private _clipMaskWidth = 0;
  private _clipMaskHeight = 0;
  private _viewportWidth = 1;
  private _viewportHeight = 1;

  public get isInTransition(): boolean {
    return this._isInTransition;
  }

  private static readonly slideDeltas: Partial<Record<string, { enter: { x: number; y: number }; exit: { x: number; y: number } }>> = {
    [SCREEN_TRANSITION_TYPES.SLIDE_IN_LEFT]: { enter: { x: -1, y: 0 }, exit: { x: 1, y: 0 } },
    [SCREEN_TRANSITION_TYPES.SLIDE_IN_RIGHT]: { enter: { x: 1, y: 0 }, exit: { x: -1, y: 0 } },
    [SCREEN_TRANSITION_TYPES.SLIDE_IN_DOWN]: { enter: { x: 0, y: 1 }, exit: { x: 0, y: -1 } },
    [SCREEN_TRANSITION_TYPES.SLIDE_IN_UP]: { enter: { x: 0, y: -1 }, exit: { x: 0, y: 1 } },
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
      this._clipMask.eventMode = "none";
      this.addChildAt(this._clipMask, 0);
      this.mask = this._clipMask;
    }

    if (this._clipMaskWidth === w && this._clipMaskHeight === h) return;
    this._clipMaskWidth = w;
    this._clipMaskHeight = h;

    this._clipMask.clear();
    this._clipMask.rect(0, 0, w, h).fill({ color: 0xffffff });
  }

  private runTransition(durationMs: number, onTick: (t: number) => void, onDone: () => void): void {
    const isDestroyed = (): boolean => this.destroyed;

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

    const width = this._viewportWidth;
    const height = this._viewportHeight;
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
      this.runTransition(
        transition.durationMs,
        (t) => {
          const inv = 1 - t;
          this.position.set(baseX + enterDx * inv, baseY + enterDy * inv);
        },
        () => {
          if (this.destroyed) return;
          this.position.set(baseX, baseY);
          this._isInTransition = false;
        },
      );
      return;
    }

    this.runTransition(
      transition.durationMs,
      (t) => {
        this.position.set(baseX + exitDx * t, baseY + exitDy * t);
      },
      () => {
        if (this.destroyed) return;
        this._isInTransition = false;
        this.destroy();
      },
    );
  }

  public onEnter(transition: ScreenTransition): void {
    this.cancelTransitionTimers();

    switch (transition.type) {
      case SCREEN_TRANSITION_TYPES.INSTANT: {
        if (transition.durationMs <= 0) {
          return;
        }

        this._isInTransition = true;
        this.visible = false;
        this.setTransitionTimeout(() => {
          if (this.destroyed) return;
          this.visible = true;
          this._isInTransition = false;
        }, transition.durationMs);

        return;
      }

      case SCREEN_TRANSITION_TYPES.SLIDE_IN_LEFT:
      case SCREEN_TRANSITION_TYPES.SLIDE_IN_RIGHT:
      case SCREEN_TRANSITION_TYPES.SLIDE_IN_DOWN:
      case SCREEN_TRANSITION_TYPES.SLIDE_IN_UP: {
        this._isInTransition = true;
        this.slideInOrOut("enter", transition);
        return;
      }

      case SCREEN_TRANSITION_TYPES.FADE_IN: {
        this.visible = true;
        this.alpha = 0;
        this._isInTransition = true;
        this.runTransition(
          transition.durationMs,
          (t) => {
            this.alpha = t;
          },
          () => {
            if (this.destroyed) return;
            this.alpha = 1;
            this._isInTransition = false;
          },
        );
        return;
      }

      default:
        return;
    }
  }

  public onExit(transition: ScreenTransition): void {
    this.cancelTransitionTimers();

    switch (transition.type) {
      case SCREEN_TRANSITION_TYPES.INSTANT: {
        this._isInTransition = true;
        this.runTransition(
          transition.durationMs,
          () => {},
          () => {
            if (this.destroyed) return;
            this._isInTransition = false;
            this.destroy();
          },
        );
        return;
      }

      case SCREEN_TRANSITION_TYPES.SLIDE_IN_LEFT:
      case SCREEN_TRANSITION_TYPES.SLIDE_IN_RIGHT:
      case SCREEN_TRANSITION_TYPES.SLIDE_IN_DOWN:
      case SCREEN_TRANSITION_TYPES.SLIDE_IN_UP: {
        this._isInTransition = true;
        this.slideInOrOut("exit", transition);
        return;
      }

      case SCREEN_TRANSITION_TYPES.FADE_IN: {
        this._isInTransition = true;
        this.runTransition(
          transition.durationMs,
          (t) => {
            this.alpha = 1 - t;
          },
          () => {
            if (this.destroyed) return;
            this._isInTransition = false;
            this.destroy();
          },
        );
        return;
      }

      default:
        return;
    }
  }

  public override destroy(): void {
    this.cancelTransitionTimers();
    this._isInTransition = false;
    super.destroy();
  }

  public override onResize(width: number, height: number, _dpr: number): void {
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    this._viewportWidth = w;
    this._viewportHeight = h;
    this.ensureClipMask(w, h);

    // Provide a sensible default `.layout` so `@pixi/layout`-aware children
    // are sized against the viewport even when the subclass forgets to set
    // its own. Without this, a screen using layout-based children silently
    // collapses to zero size and renders nothing. Subclasses that need
    // custom layout values can assign `this.layout = { ... }` after calling
    // `super.onResize(...)`. Subclasses that don't use `@pixi/layout` at all
    // are unaffected: children without their own `.layout` are positioned
    // freely via `.x` / `.y`.
    const currentLayout = (this as unknown as { layout?: unknown }).layout;
    if (currentLayout === undefined || currentLayout === null) {
      this.layout = { width: w, height: h };
    }
  }
}
