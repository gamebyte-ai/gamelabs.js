import * as PIXI from "pixi.js";
import type { IPopupView } from "./IPopupView.js";
import { HudViewBase } from "../hud/HudViewBase.js";

/**
 * Base PixiJS popup view.
 *
 * - is a `PIXI.Container`
 * - implements `IPopupView` (extends `IView`)
 * - provides a full-screen blocker that prevents interaction with content below
 * - fades in on open, fades out on close
 * - `isInTransition` is true during animations; input on children is blocked
 *
 * Does not itself use `@pixi/layout`. Subclasses that need layout for their
 * content can set `this.layout = { ... }` themselves (typically in an
 * `onResize` override for pixel-sized layouts).
 */
export class PopupView extends HudViewBase implements IPopupView {
  private static readonly FADE_DURATION_MS = 200;

  private _blocker: PIXI.Graphics | null = null;
  private _isInTransition = false;
  private _transitionRafId: number | null = null;

  public get isInTransition(): boolean {
    return this._isInTransition;
  }

  public override onResize(width: number, height: number, _dpr: number): void {
    this._redrawBlocker(Math.max(1, width), Math.max(1, height));
  }

  public onOpen(): void {
    this.alpha = 0;
    this._isInTransition = true;
    this.eventMode = "static";
    this.interactiveChildren = false;

    this.runFade(0, 1, PopupView.FADE_DURATION_MS, () => {
      if (this.destroyed) return;
      this._isInTransition = false;
      this.interactiveChildren = true;
    });
  }

  public onClose(done: () => void): void {
    this._isInTransition = true;
    this.interactiveChildren = false;

    this.runFade(this.alpha, 0, PopupView.FADE_DURATION_MS, () => {
      if (this.destroyed) return;
      this._isInTransition = false;
      done();
    });
  }

  private _redrawBlocker(width: number, height: number): void {
    if (!this._blocker) {
      this._blocker = new PIXI.Graphics();
      this._blocker.eventMode = "static";
      this.addChildAt(this._blocker, 0);
      this._blocker.on("pointerdown", (e: PIXI.FederatedPointerEvent) => e.stopPropagation());
      this._blocker.on("pointerup", (e: PIXI.FederatedPointerEvent) => e.stopPropagation());
      this._blocker.on("pointermove", (e: PIXI.FederatedPointerEvent) => e.stopPropagation());
    }
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));
    this._blocker.clear();
    this._blocker.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.5 });
  }

  private cancelTransition(): void {
    if (this._transitionRafId !== null) {
      cancelAnimationFrame(this._transitionRafId);
      this._transitionRafId = null;
    }
  }

  private runFade(from: number, to: number, durationMs: number, onDone: () => void): void {
    this.cancelTransition();
    const isDestroyed = (): boolean => this.destroyed;

    if (durationMs <= 0) {
      this.alpha = to;
      if (!isDestroyed()) onDone();
      return;
    }

    this.alpha = from;
    const startMs = typeof performance !== "undefined" ? performance.now() : Date.now();

    const step = (nowMs: number): void => {
      if (isDestroyed()) return;
      const t = Math.min(1, Math.max(0, (nowMs - startMs) / durationMs));
      this.alpha = from + (to - from) * t;
      if (t >= 1) {
        this._transitionRafId = null;
        if (!isDestroyed()) onDone();
        return;
      }
      this._transitionRafId = requestAnimationFrame(step);
    };
    this._transitionRafId = requestAnimationFrame(step);
  }

  public override destroy(): void {
    this.cancelTransition();
    this._isInTransition = false;
    this._blocker = null;
    super.destroy();
  }
}
