import type { GamelabsAppConfig } from "./types.js";
import { Container } from "./di/Container.js";
import type { IInstanceResolver } from "./di/IInstanceResolver.js";
import { ViewBinder } from "../views/ViewBinder.js";
import { ViewFactory } from "../views/ViewFactory.js";
import { UpdateService } from "../services/UpdateService.js";

export class GamelabsApp {
  readonly canvas: HTMLCanvasElement;
  readonly mount: HTMLElement | undefined;

  /**
   * Optional framework helpers available to all apps.
   * You can use these in your composition root to bind view/controller pairs
   * and to run ordered per-frame updates.
   */
  readonly viewBinder = new ViewBinder();
  readonly updateService = new UpdateService();

  /**
   * App-level singleton container.
   * Intended as the root resolver passed into controllers.
   */
  readonly di = new Container();

  /**
   * View + controller factory for the app.
   * Controllers receive `{ view, resolver }` via `ViewBinder` and resolve deps from `di`.
   */
  readonly viewFactory = new ViewFactory<IInstanceResolver>(this.viewBinder, this.di);

  private _compositionRootConfigured = false;

  /**
   * Optional fixed logical dimensions provided via config.
   * If set, auto-resize will use these instead of measured DOM size.
   */
  private readonly _fixedWidth: number | undefined;
  private readonly _fixedHeight: number | undefined;

  /**
   * Last known logical dimensions (not DPR-scaled).
   */
  private _width: number | undefined;
  private _height: number | undefined;
  private _rafId: number | null = null;
  private _lastFrameTimeMs: number | null = null;
  private readonly _onWindowResize = (): void => {
    const dpr = typeof window !== "undefined" ? (window.devicePixelRatio ?? 1) : 1;

    const measureEl = this.mount ?? this.canvas;
    const rect =
      typeof measureEl.getBoundingClientRect === "function" ? measureEl.getBoundingClientRect() : null;

    const measuredWidth = rect?.width ?? measureEl.clientWidth ?? this.canvas.clientWidth ?? this.canvas.width;
    const measuredHeight =
      rect?.height ?? measureEl.clientHeight ?? this.canvas.clientHeight ?? this.canvas.height;

    // Important: do NOT use the last known size as an override here.
    // Otherwise the resize handler will stop tracking DOM size changes and canvases will be CSS-scaled (stretched).
    const width = Math.max(1, Math.floor(this._fixedWidth ?? measuredWidth));
    const height = Math.max(1, Math.floor(this._fixedHeight ?? measuredHeight));

    this.onResize(width, height, dpr);
  };

  constructor(config: GamelabsAppConfig) {
    this.canvas = config.canvas ?? document.createElement("canvas");
    this.mount = config.mount;
    this._fixedWidth = config.width;
    this._fixedHeight = config.height;
    this._width = config.width;
    this._height = config.height;

    // Auto-resize hook for browser usage.
    if (typeof window !== "undefined") {
      window.addEventListener("resize", this._onWindowResize, { passive: true });
    }

    // Base DI bindings (always available).
    this.di.bindInstance(UpdateService, this.updateService);
    this.di.bindInstance(ViewBinder, this.viewBinder);
    this.di.bindInstance(GamelabsApp, this);
  }

  /**
   * Initialization hook for apps/framework layers.
   * Intended to be overridden by child classes.
   *
   * Users should call this manually in their app lifecycle.
   */
  async initialize(): Promise<void> {
    this.setupCompositionRoot();
  }

  /**
   * Composition root hook for binding app-level singletons.
   * Intended to be overridden by child classes.
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected configureDI(): void {}

  /**
   * Composition root hook for view/controller registrations.
   * Intended to be overridden by child classes.
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected configureViews(): void {}

  /**
   * Runs the composition root hooks once.
   * Apps should call this before creating any views/controllers.
   */
  protected setupCompositionRoot(): void {
    if (this._compositionRootConfigured) return;
    this._compositionRootConfigured = true;
    try {
      this.configureDI();
      this.configureViews();
    } catch (e) {
      this._compositionRootConfigured = false;
      throw e;
    }
  }

  /**
   * Resize hook.
   * Intended to be overridden by child classes.
   *
   * This is automatically called on the browser's `window.resize` event.
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onResize(_width: number, _height: number, _dpr: number): void {}

  /**
   * Manually triggers a resize calculation and calls `onResize(width, height, dpr)`.
   * Useful for an initial layout pass after mounting.
   */
  requestResize(): void {
    this._onWindowResize();
  }

  /**
   * Per-frame hook called by `mainLoop()`.
   *
   * By default this runs the ordered callbacks registered in `updateService`.
   * If you need custom per-frame logic, override `onStep()` instead of `step()`.
   */
  step(timestepSeconds: number): void {
    this.updateService.tick(timestepSeconds);
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
    this.updateService.clear();
  }
}

