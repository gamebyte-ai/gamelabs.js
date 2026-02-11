import type { GamelabsAppConfig, GamelabsAppMode } from "./types.js";
import { Binder } from "./Binder.js";
import { UpdateService } from "./UpdateService.js";

export class GamelabsApp {
  readonly mode: GamelabsAppMode;
  readonly canvas: HTMLCanvasElement;

  /**
   * Optional framework helpers available to all apps.
   * You can use these in your composition root to bind view/controller pairs
   * and to run ordered per-frame updates.
   */
  readonly binder = new Binder();
  readonly updates = new UpdateService();

  private _width: number | undefined;
  private _height: number | undefined;
  private _rafId: number | null = null;
  private _lastFrameTimeMs: number | null = null;
  private readonly _onWindowResize = () => this.onResize();

  constructor(config: GamelabsAppConfig) {
    this.mode = config.mode;
    this.canvas = config.canvas ?? document.createElement("canvas");
    this._width = config.width;
    this._height = config.height;

    // Auto-resize hook for browser usage.
    if (typeof window !== "undefined") {
      window.addEventListener("resize", this._onWindowResize, { passive: true });
    }
  }

  /**
   * Initialization hook for apps/framework layers.
   * Intended to be overridden by child classes.
   *
   * Users should call this manually in their app lifecycle.
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async initialize(): Promise<void> {}

  /**
   * Resize hook.
   * Intended to be overridden by child classes.
   *
   * This is automatically called on the browser's `window.resize` event.
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onResize(): void {}

  /**
   * Per-frame hook called by `mainLoop()`.
   *
   * By default this runs the ordered callbacks registered in `updates`.
   * If you need custom per-frame logic, override `onStep()` instead of `step()`.
   */
  step(timestepSeconds: number): void {
    this.updates.tick(timestepSeconds);
    this.onStep(timestepSeconds);
  }

  /**
   * Optional per-frame hook for app-specific logic.
   * Intended to be overridden by child classes.
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected onStep(_timestepSeconds: number): void {}

  /**
   * Starts the requestAnimationFrame-driven main loop and computes frame timestep.
   *
   * Users should call this manually (typically after `initialize()`).
   */
  mainLoop(): void {
    if (this._rafId !== null) return;

    const tick = (nowMs: number) => {
      if (this._lastFrameTimeMs === null) this._lastFrameTimeMs = nowMs;
      const dtSeconds = Math.max(0, (nowMs - this._lastFrameTimeMs) / 1000);
      this._lastFrameTimeMs = nowMs;

      this.step(dtSeconds);
      this._rafId = requestAnimationFrame(tick);
    };

    this._rafId = requestAnimationFrame(tick);
  }

  /**
   * Stops the main loop if it is running.
   */
  stopMainLoop(): void {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._lastFrameTimeMs = null;
  }

  /**
   * Current logical width (not DPR-scaled).
   */
  get width(): number {
    return this._width ?? this.canvas.clientWidth ?? this.canvas.width;
  }

  /**
   * Current logical height (not DPR-scaled).
   */
  get height(): number {
    return this._height ?? this.canvas.clientHeight ?? this.canvas.height;
  }

  /**
   * Minimal resize hook. Rendering backends (Pixi/Three) will be added later.
   */
  resize(width: number, height: number): void {
    this._width = width;
    this._height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  /**
   * Cleanup hook.
   * Removes any base listeners/timers.
   *
   * Child classes should override if needed, and call `super.destroy()`.
   */
  destroy(): void {
    this.stopMainLoop();
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", this._onWindowResize);
    }
    this.binder.destroyAll();
    this.updates.clear();
  }
}

