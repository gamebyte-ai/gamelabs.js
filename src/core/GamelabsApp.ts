import type { GamelabsAppConfig } from "./types.js";
import { World } from "./World.js";
import { DevUtils } from "./dev/DevUtils.js";
import { Logger } from "./dev/Logger.js";
import { DIContainer } from "./di/DIContainer.js";
import type { IInstanceResolver } from "./di/IInstanceResolver.js";
import { ViewFactory } from "./views/ViewFactory.js";
import { UpdateService } from "./services/UpdateService.js";
import { Hud } from "../index.js";
import { AssetLoader } from "./assets/AssetLoader.js";
import type { IModuleBinding } from "./IModuleBinding.js";
import { ILogger } from "./dev/ILogger.js";
import { IDevUtils } from "./dev/IDevUtils.js";

export class GamelabsApp {
  readonly canvas: HTMLCanvasElement;
  readonly mount: HTMLElement | undefined;
  readonly sharedContext: boolean;

  world: World | null = null;
  hud: Hud | null = null;
  private _devUtils: DevUtils | null = null;
  private _assetLoader: AssetLoader | null = null;
  private readonly _logger: Logger;

  readonly updateService = new UpdateService();
  public readonly diContainer: DIContainer;
  private _viewFactory: ViewFactory<IInstanceResolver> | null = null;

  private _isInitialized = false;
  private _moduleList: IModuleBinding[] = [];

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

    this._width = width;
    this._height = height;
    this.canvas.width = width;
    this.canvas.height = height;

    this.world?.resize(width, height, dpr);
    this.hud?.resize(width, height, dpr);

    this._devUtils?.resize(width, height, dpr);
    this._viewFactory?.resize(width, height, dpr);
  };

  constructor(config: GamelabsAppConfig) {
    this.canvas = config.canvas ?? document.createElement("canvas");
    this.mount = config.mount;
    this.sharedContext = config.sharedContext ?? false;
    this._fixedWidth = config.width;
    this._fixedHeight = config.height;
    this._width = config.width;
    this._height = config.height;

    this.diContainer = new DIContainer();
    this._logger = new Logger();

    // Auto-resize hook for browser usage.
    if (typeof window !== "undefined") {
      window.addEventListener("resize", this._onWindowResize, { passive: true });
    }

    // Base DI bindings (always available).
    this.diContainer.bindInstance(UpdateService, this.updateService);
    this.diContainer.bindInstance(GamelabsApp, this);
    this.diContainer.bindInstance(ILogger, this._logger, [Logger]);
  }

  protected get logger(): ILogger {
    return this._logger;
  }

  public get devUtils(): DevUtils {
    if (!this._devUtils) throw new Error("DevUtils is not initialized");
    return this._devUtils;
  }

  public get assetLoader(): AssetLoader {
    if (!this._assetLoader) throw new Error("AssetLoader is not initialized");
    return this._assetLoader;
  }

  public get viewFactory(): ViewFactory<IInstanceResolver> {
    if (!this._viewFactory) throw new Error("ViewFactory is not initialized");
    return this._viewFactory;
  }

  async initialize(): Promise<void> {
    if (this._isInitialized) return;
    
    this._isInitialized = true;
    
    await this.createWorld();
    await this.createHud();

    this._devUtils = new DevUtils(this.world!, this.hud!, this._logger);
    this._assetLoader = new AssetLoader(this._logger);
    this._viewFactory = new ViewFactory<IInstanceResolver>(this.diContainer, this._assetLoader);

    this.diContainer.bindInstance(IDevUtils, this._devUtils as IDevUtils);
    this.diContainer.bindInstance(AssetLoader, this._assetLoader);

    this._viewFactory.setViewContainers(this.world, this.hud);

    this.registerModules();

    for (const moduleBinding of this._moduleList) {
      moduleBinding.configureDI(this.diContainer);
    }
    this.configureDI();

    for (const moduleBinding of this._moduleList) {
      moduleBinding.configureViews(this.viewFactory);
    }
    this.configureViews();

    for (const moduleBinding of this._moduleList) {
      moduleBinding.loadAssets(this.assetLoader);
    }
    this.loadAssets();
    await this.waitForAssetsLoaded();

    this.postInitialize();
    this.requestResize();
  }

  private async waitForAssetsLoaded(): Promise<void> {
    // Give `loadAssets()` a chance to register any synchronous asset requests.
    await this.nextTick();

    while (this.assetLoader.loadedItems < this.assetLoader.totalItems) {
      await this.nextTick();
    }
  }

  private nextTick(): Promise<void> {
    if (typeof requestAnimationFrame === "function") {
      return new Promise((resolve) => requestAnimationFrame(() => resolve()));
    }

    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  private async createWorld(): Promise<void> {
    if (!this.mount) throw new Error("Missing mount element");
    this.world = await World.create(this.canvas, { mount: this.mount, canvasClassName: "layer world3d" });
  }

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
      return;
    }

    // Legacy: separate Pixi canvas layer (auto-rendered by Pixi).
    this.hud = await Hud.create(this.mount);
  }

  protected addModule(moduleBinding: IModuleBinding): void {
    this._moduleList.push(moduleBinding);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected registerModules(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected postInitialize(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected configureDI(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected configureViews(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected loadAssets(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  protected preDestroy(): void {}

  /**
   * Manually triggers a resize calculation and forwards it to the active screen.
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

    this._devUtils?.destroy();
    this._devUtils = null;

    this.hud?.destroy();
    this.hud = null;

    this.world?.destroy();
    this.world = null;

    this.canvas.remove();
  }
}

