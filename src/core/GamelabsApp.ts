import type { GamelabsAppConfig } from "./types.js";
import { World } from "./World.js";
import { WorldDebugger } from "./WorldDebugger.js";
import { Container } from "./di/Container.js";
import type { IInstanceResolver } from "./di/IInstanceResolver.js";
import { ViewBinder } from "../views/ViewBinder.js";
import { ViewFactory } from "../views/ViewFactory.js";
import { UpdateService } from "../services/UpdateService.js";
import { Hud } from "../index.js";

export class GamelabsApp {
  readonly canvas: HTMLCanvasElement;
  readonly mount: HTMLElement | undefined;
  readonly sharedContext: boolean;

  world: World | null = null;
  worldDebugger: WorldDebugger | null = null;
  hud: Hud | null = null;

  readonly viewBinder = new ViewBinder();
  readonly updateService = new UpdateService();
  readonly di = new Container();
  readonly viewFactory = new ViewFactory<IInstanceResolver>(this.viewBinder, this.di);

  private _isInitialized = false;

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
  private _statsVisible = false;
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

    this._width = width;
    this._height = height;
    this.canvas.width = width;
    this.canvas.height = height;

    this.world?.resize(width, height, dpr);
    this.hud?.resize(width, height, dpr);
    this.onResize(width, height, dpr);
  };

  constructor(config: GamelabsAppConfig) {
    this.canvas = config.canvas ?? document.createElement("canvas");
    this.mount = config.mount;
    this.sharedContext = config.sharedContext ?? false;
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

  async initialize(): Promise<void> {
    if (this._isInitialized) return;
    
    this._isInitialized = true;
    
    await this.createWorld();
    await this.createHud();

    this.configureDI();
    this.configureViews();

    this.postInitialize();

    this.requestResize();
  }

  private async createWorld(): Promise<void> {
    if (!this.mount) throw new Error("Missing mount element");
    this.world = await World.create(this.canvas, { mount: this.mount, canvasClassName: "layer world3d" });
    this.worldDebugger = new WorldDebugger(this.world);
  }

  protected readonly attachToWorld = (parent: unknown | null, child: unknown): void => {
    const p = parent as any;
    const c = child as any;

    // Allow `null` to mean "attach to World root (scene)".
    if (p === null) {
      if (!this.world) throw new Error("World is not initialized");
      this.world.add(c);
      return;
    }

    // Support both `World` and `THREE.Object3D` (and any custom parent with an `.add()` method).
    if (p && typeof p.add === "function") {
      p.add(c);
      return;
    }

    throw new Error("Invalid world parent: expected a World/THREE.Object3D with .add(), or null");
  };

  private async createHud(): Promise<void> {
    if (!this.mount) throw new Error("Missing mount element");

    if (this.sharedContext) {
      if (!this.world) throw new Error("World is not initialized");

      // Reuse the SAME canvas + WebGL context created/owned by Three.js.
      // Rendering is driven manually in `mainLoop()` so we can do Three → Pixi ordering.
      this.hud = await Hud.create(this.mount, {
        canvas: this.canvas,
        context: this.world.renderer.getContext() as WebGL2RenderingContext,
        manualRender: true
      });
      this.hud.showStats(this._statsVisible);
      return;
    }

    // Legacy: separate Pixi canvas layer (auto-rendered by Pixi).
    this.hud = await Hud.create(this.mount);
    this.hud.showStats(this._statsVisible);
  }

  protected readonly attachToHud = (parent: unknown | null, view: unknown): void => {
    const p = parent as any;
    const v = view as any;

    // Allow `null` to mean "attach to HUD root (stage)".
    if (p === null) {
      if (!this.hud) throw new Error("HUD is not initialized");
      this.hud.app.stage.addChild(v);
      return;
    }

    // Support any Pixi container-like parent with `.addChild()`.
    if (p && typeof p.addChild === "function") {
      p.addChild(v);
      return;
    }

    throw new Error("Invalid HUD parent: expected a Pixi Container with .addChild(), or null");
  };

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected postInitialize(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected configureDI(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected configureViews(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected preDestroy(): void {}

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
  private requestResize(): void {
    this._onWindowResize();
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

      this.updateService.tick(dtSeconds);
      this.onStep(dtSeconds);
      this.world?.render();
      if (this.hud?.manualRender) this.hud.render();
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
   * Toggles a small HUD stats panel (top-left).
   */
  showStats(show: boolean): void {
    this._statsVisible = show;
    this.hud?.showStats(show);
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
    
    this.preDestroy();

    this.updateService.clear();

    this.worldDebugger?.destroy();

    this.hud?.destroy();
    this.hud = null;

    this.world?.destroy();
    this.world = null;

    this.canvas.remove();
  }
}

