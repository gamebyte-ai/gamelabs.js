import type { GamelabsAppConfig } from "./types.js";
import { computeViewportRect, type ViewportConfig, type ViewportRect } from "./utilities/computeViewportRect.js";
import { World } from "./world/World.js";
import type { DevUtils } from "./dev/DevUtils.js";
import { DevUtils3D } from "./dev/DevUtils3D.js";
import { Logger } from "./dev/Logger.js";
import { DIContainer } from "./di/DIContainer.js";
import type { IInstanceResolver } from "./di/IInstanceResolver.js";
import { ViewFactory } from "./views/ViewFactory.js";
import { UpdateManager } from "./utilities/UpdateManager.js";
import { StorageService } from "./services/StorageService.js";
import { Hud } from "./hud/Hud.js";
import { AssetManager } from "./assets/AssetManager.js";
import { WorldAssetManager } from "./assets/WorldAssetManager.js";
import type { ModuleBinding } from "./ModuleBinding.js";
import { ILogger } from "./dev/ILogger.js";
import { LogTypes } from "./dev/LogTypes.js";
import { IDevUtils } from "./dev/IDevUtils.js";
import { IViewFactory } from "./views/IViewFactory.js";
import { InputManager } from "./input/InputManager.js";
import { IInputManager } from "./input/IInputManager.js";
import { UIEvents } from "./ui/UIEvents.js";
import { KeyboardListener } from "./input/KeyboardListener.js";
import { AudioService } from "./services/AudioService.js";
import { IApp } from "./app/IApp.js";
import { AppEvents } from "./app/AppEvents.js";
import { StyleManager } from "./styles/StyleManager.js";

export class GamelabsApp implements IApp {
  //  MEMBERS
  readonly canvas: HTMLCanvasElement;
  readonly mount: HTMLElement | undefined;
  protected world: World | null = null;
  protected hud: Hud | null = null;
  private _devUtils: DevUtils | null = null;
  private _assetManager: AssetManager | null = null;
  private readonly _logger: Logger;

  readonly updateManager = new UpdateManager();
  readonly storageService = new StorageService(this.constructor.name);
  public readonly diContainer: DIContainer;
  public readonly viewDiContainer: DIContainer;
  private _viewFactory: ViewFactory<IInstanceResolver> | null = null;
  private _inputManager: InputManager | null = null;
  private _keyboardListener: KeyboardListener | null = null;
  private _audioService: AudioService | null = null;

  private _isInitialized = false;
  private _initFailed = false;
  private _moduleList: ModuleBinding[] = [];

  /**
   * Optional fixed logical dimensions provided via config.
   * If set, auto-resize will use these instead of measured DOM size.
   */
  private readonly _fixedWidth: number | undefined;
  private readonly _fixedHeight: number | undefined;

  /**
   * Optional viewport fit (letterbox / pillarbox). Undefined ⇒ canvases fill the mount.
   */
  private readonly _viewport: ViewportConfig | undefined;

  /**
   * Last known logical dimensions (not DPR-scaled).
   */
  private _width: number | undefined;
  private _height: number | undefined;
  private _dpr: number = typeof window !== "undefined" ? (window.devicePixelRatio ?? 1) : 1;
  private readonly _appEvents = new AppEvents();
  private _rafId: number | null = null;
  private _lastFrameTimeMs: number | null = null;
  private _resizeObserver: ResizeObserver | null = null;
  private readonly _onWindowResize = (): void => {
    const dpr = typeof window !== "undefined" ? (window.devicePixelRatio ?? 1) : 1;

    const measureEl = this.mount ?? this.canvas;
    const rect = typeof measureEl.getBoundingClientRect === "function" ? measureEl.getBoundingClientRect() : null;

    const measuredWidth = rect?.width ?? measureEl.clientWidth ?? this.canvas.clientWidth ?? this.canvas.width;
    const measuredHeight = rect?.height ?? measureEl.clientHeight ?? this.canvas.clientHeight ?? this.canvas.height;

    // Important: do NOT use the last known size as an override here.
    // Otherwise the resize handler will stop tracking DOM size changes and canvases will be CSS-scaled (stretched).
    const availWidth = Math.max(1, Math.floor(this._fixedWidth ?? measuredWidth));
    const availHeight = Math.max(1, Math.floor(this._fixedHeight ?? measuredHeight));

    // Derive the play-rect from the available size. With no viewport config this
    // is the full available area (legacy behavior); with fit:"contain" it is the
    // centered, aspect-constrained sub-rect — the surrounding mount area becomes
    // inert letterbox/pillarbox bars.
    const playRect = computeViewportRect(availWidth, availHeight, this._viewport);
    const width = playRect.width;
    const height = playRect.height;

    this._width = width;
    this._height = height;
    this._dpr = dpr;
    this.canvas.width = width;
    this.canvas.height = height;

    this.world?.resize(width, height, dpr);
    this.hud?.resize(width, height);

    // When letterboxing, the canvases are smaller than the mount and must be
    // centered explicitly (the host's full-bleed `.layer` CSS would otherwise
    // stretch them back to the mount size).
    if (this._viewport?.fit === "contain") this._positionLayers(playRect);

    this.onResize(width, height, dpr);
    this._devUtils?.resize(width, height, dpr);
    this._appEvents.emitResize(width, height, dpr);
  };

  /**
   * Centers both render layers (Three World + Pixi HUD) on the given play-rect
   * via inline styles. Inline beats the host `.layer` stylesheet rule, so this
   * works regardless of the page's CSS.
   */
  private _positionLayers(rect: ViewportRect): void {
    const layers: Array<HTMLElement | undefined> = [this.canvas, this.hud?.canvas as HTMLElement | undefined];
    for (const el of layers) {
      if (!el) continue;
      el.style.position = "absolute";
      el.style.left = `${rect.x}px`;
      el.style.top = `${rect.y}px`;
      el.style.width = `${rect.width}px`;
      el.style.height = `${rect.height}px`;
    }
  }

  // Tracks whether the layer-default stylesheet has been injected into the
  // document. Static so re-mounting the app (e.g. HMR) is idempotent.
  private static _layerStylesInjected = false;
  private static readonly _layerStyleElementId = "gamelabsjs-layer-defaults";

  /**
   * Injects a low-specificity (`:where()`) stylesheet so the two render
   * canvases (`canvas.layer.world3d` + `canvas.layer.hud2d`) stack correctly
   * even when the host page omits the canonical CSS. Any host CSS with
   * non-zero specificity overrides this.
   *
   * Without this, a host page like `<div id="stage"></div>` with no canvas
   * styling renders the opaque 3D canvas at full size and pushes the HUD
   * canvas out of the viewport — a silent "black screen" with no error.
   */
  private static _ensureLayerStyles(): void {
    if (GamelabsApp._layerStylesInjected) return;
    if (typeof document === "undefined") return;
    if (document.getElementById(GamelabsApp._layerStyleElementId)) {
      GamelabsApp._layerStylesInjected = true;
      return;
    }
    const style = document.createElement("style");
    style.id = GamelabsApp._layerStyleElementId;
    style.textContent =
      ":where(canvas.layer){position:absolute;inset:0;width:100%;height:100%;display:block;}" +
      ":where(canvas.layer.world3d){z-index:0;}" +
      ":where(canvas.layer.hud2d){z-index:1;}";
    document.head.appendChild(style);
    GamelabsApp._layerStylesInjected = true;
  }

  /**
   * Ensures the mount element creates a positioning context so absolutely
   * positioned canvas layers resolve against it instead of the viewport.
   * No-op if the host already set `position: relative|absolute|fixed|sticky`.
   */
  private _ensureMountPositioned(): void {
    if (!this.mount) return;
    if (typeof window === "undefined") return;
    if (typeof window.getComputedStyle !== "function") return;
    const computed = window.getComputedStyle(this.mount);
    if (computed.position === "static") {
      this.mount.style.position = "relative";
    }
  }

  //  GETTERS
  protected get logger(): ILogger {
    return this._logger;
  }

  protected get devUtils(): IDevUtils {
    if (!this._devUtils) {
      this._logger.log("DevUtils is not initialized", LogTypes.Error);
      throw new Error("DevUtils is not initialized");
    }
    return this._devUtils;
  }

  protected get assetManager(): AssetManager {
    if (!this._assetManager) {
      this._logger.log("AssetLoader is not initialized", LogTypes.Error);
      throw new Error("AssetLoader is not initialized");
    }
    return this._assetManager;
  }

  protected get viewFactory(): ViewFactory<IInstanceResolver> {
    if (!this._viewFactory) {
      this._logger.log("ViewFactory is not initialized", LogTypes.Error);
      throw new Error("ViewFactory is not initialized");
    }
    return this._viewFactory;
  }

  protected get audioService(): AudioService {
    if (!this._audioService) {
      this._logger.log("AudioService is not initialized", LogTypes.Error);
      throw new Error("AudioService is not initialized");
    }
    return this._audioService;
  }

  //  CONSTRUCTOR
  constructor(config: GamelabsAppConfig) {
    this.canvas = config.canvas ?? document.createElement("canvas");
    this.mount = config.mount;
    this._fixedWidth = config.width;
    this._fixedHeight = config.height;
    this._width = config.width;
    this._height = config.height;
    this._viewport = config.viewport;

    // Letterbox bars are simply the mount area not covered by the centered
    // canvases; paint the mount background so they read as deliberate bars.
    if (this._viewport?.background && this.mount) {
      this.mount.style.background = this._viewport.background;
    }

    this._logger = new Logger();
    this.diContainer = new DIContainer(this._logger);
    this.viewDiContainer = new DIContainer(this._logger);

    // Auto-resize hook: prefer ResizeObserver on mount element, fall back to window resize.
    if (this.mount && typeof ResizeObserver !== "undefined") {
      this._resizeObserver = new ResizeObserver(() => {
        this._onWindowResize();
      });
      this._resizeObserver.observe(this.mount);
    } else if (typeof window !== "undefined") {
      window.addEventListener("resize", this._onWindowResize, { passive: true });
    }

    // Base DI bindings (always available).
    this.diContainer.bindInstance(UpdateManager, this.updateManager);
    this.diContainer.bindInstance(StorageService, this.storageService);
    this.diContainer.bindInstance(GamelabsApp, this, [IApp]);
    this.viewDiContainer.bindInstance(IApp, this);
    this.diContainer.bindInstance(AppEvents, this._appEvents);
    this.viewDiContainer.bindInstance(AppEvents, this._appEvents);
    this.diContainer.bindInstance(ILogger, this._logger, [Logger]);
    this.viewDiContainer.bindInstance(ILogger, this._logger, [Logger]);

    this.viewDiContainer.bindInstance(StyleManager, new StyleManager());
  }

  //  METHODS
  public async initialize(): Promise<void> {
    if (this._isInitialized) return;
    if (this._initFailed) {
      throw new Error("App initialization previously failed. Create a new instance to retry.");
    }

    try {
      GamelabsApp._ensureLayerStyles();
      this._ensureMountPositioned();

      await this.createWorld();
      await this.createHud();

      this._devUtils = new DevUtils3D(this.world!, this.hud!, this._logger);
      this.diContainer.bindInstance(IDevUtils, this._devUtils as IDevUtils);
      this.viewDiContainer.bindInstance(IDevUtils, this._devUtils as IDevUtils);

      this._assetManager = new WorldAssetManager(this._logger);
      this.viewDiContainer.bindInstance(AssetManager, this._assetManager);

      const uiEvents = new UIEvents();
      this.diContainer.bindInstance(UIEvents, uiEvents);

      this._viewFactory = new ViewFactory<IInstanceResolver>(this._logger, this.diContainer, this.viewDiContainer);
      this._viewFactory.setViewContainers(this.world, this.hud);
      this._viewFactory.setUIEvents(uiEvents);
      this.viewDiContainer.bindInstance(IViewFactory, this._viewFactory);

      this._inputManager = new InputManager(this.canvas, this.hud, this.world, this.mount);
      this.viewDiContainer.bindInstance(IInputManager, this._inputManager);

      this._keyboardListener = new KeyboardListener();
      this.diContainer.bindInstance(KeyboardListener, this._keyboardListener);
      this.viewDiContainer.bindInstance(KeyboardListener, this._keyboardListener);

      this._audioService = new AudioService();
      this._audioService.initialize(this._assetManager);
      this.diContainer.bindInstance(AudioService, this._audioService);

      this.registerModules();

      for (const moduleBinding of this._moduleList) {
        moduleBinding.configureDI(this.diContainer, this.viewDiContainer);
      }
      this.configureDI();

      for (const moduleBinding of this._moduleList) {
        moduleBinding.configureViews(this.viewFactory);
      }
      this.configureViews();

      for (const moduleBinding of this._moduleList) {
        this.assetManager.loadAll(moduleBinding.assetRequestList.getRequests());
      }
      this.loadAssets();
      await this._assetManager.waitForAll();

      this.postInitialize();
      this.requestResize();

      this._inputManager.startListening();
      this._keyboardListener!.startListening();

      this._isInitialized = true;
    } catch (err) {
      this._initFailed = true;
      throw err;
    }
  }

  private async createWorld(): Promise<void> {
    if (!this.mount) {
      this._logger.log("Missing mount element", LogTypes.Error);
      throw new Error("Missing mount element");
    }
    this.world = await World.create(this.canvas, {
      mount: this.mount,
      canvasClassName: "layer world3d",
      logger: this._logger,
    });
  }

  private async createHud(): Promise<void> {
    if (!this.mount) {
      this._logger.log("Missing mount element", LogTypes.Error);
      throw new Error("Missing mount element");
    }

    this.hud = await Hud.create(this.mount, { logger: this._logger });
  }

  protected addModule(moduleBinding: ModuleBinding): void {
    this._moduleList.push(moduleBinding);
  }

  protected registerModules(): void {}

  protected postInitialize(): void {}

  protected configureDI(): void {}

  protected configureViews(): void {}

  protected loadAssets(): void {}

  protected preDestroy(): void {}

  /**
   * Manually triggers a resize calculation and forwards it to the active screen.
   * Useful for an initial layout pass after mounting.
   */
  private requestResize(): void {
    this._onWindowResize();
  }

  /**
   * Called when the viewport is resized. Override to forward resize to custom managers (e.g. GameCameraManager).
   */

  protected onResize(_width: number, _height: number, _dpr: number): void {}

  /**
   * Optional per-frame hook for app-specific logic.
   * Intended to be overridden by child classes.
   */

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

      this.updateManager.tick(dtSeconds);
      this.onStep(dtSeconds);
      this.world?.render();
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
   * Current device pixel ratio.
   */
  get dpr(): number {
    return this._dpr;
  }

  /**
   * Cleanup hook.
   * Removes any base listeners/timers.
   *
   * Child classes should override if needed, and call `super.destroy()`.
   */
  destroy(): void {
    this.stopMainLoop();
    this._inputManager?.stopListening();
    this._keyboardListener?.stopListening();
    this._audioService?.destroy();
    this._audioService = null;
    this._keyboardListener = null;
    this._inputManager = null;
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    } else if (typeof window !== "undefined") {
      window.removeEventListener("resize", this._onWindowResize);
    }
    this.preDestroy();
    this.updateManager.clear();

    this._devUtils?.destroy();
    this._devUtils = null;

    this.hud?.destroy();
    this.hud = null;

    this.world?.destroy();
    this.world = null;

    this.canvas.remove();
  }
}
