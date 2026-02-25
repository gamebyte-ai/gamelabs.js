import "@pixi/layout";
import { Application, Container, Graphics, Text, TextStyle, type ApplicationOptions } from "pixi.js";
import type { IViewContainer } from "./views/IViewContainer.js";
import type { ILogger } from "./dev/ILogger.js";

export type HudCreateOptions = {
  /**
   * If provided, Pixi will render into this canvas instead of creating its own.
   * Useful for sharing a single WebGL context with another renderer (e.g. Three.js).
   */
  canvas?: HTMLCanvasElement;

  /**
   * If provided, Pixi will use this existing WebGL context.
   * Note: a WebGL context is bound to a specific canvas; if you pass `context`, you should also pass `canvas`.
   */
  context?: WebGL2RenderingContext;

  /**
   * CSS className(s) applied to the Pixi canvas.
   * If omitted, defaults to `"layer hud2d"`.
   */
  canvasClassName?: string;
  /**
   * Renderer background alpha. Defaults to 0 (transparent).
   */
  backgroundAlpha?: number;
  /**
   * Enable antialiasing. Defaults to true.
   */
  antialias?: boolean;
  /**
   * Pixi resolution (device pixel ratio). Defaults to `window.devicePixelRatio || 1`, clamped to 2.
   */
  resolution?: number;
  /**
   * Pixi preference: `"webgl"` or `"webgpu"`. Defaults to `"webgl"`.
   */
  preference?: ApplicationOptions["preference"];

  /**
   * If true, Pixi will NOT start its internal ticker/render loop.
   * In shared-context mode you typically render manually after Three.js each frame.
   */
  manualRender?: boolean;

  /**
   * Optional logger instance to use for HUD-level logging.
   * If omitted, a console-backed logger is used.
   */
  logger?: ILogger;
};

export class Hud implements IViewContainer {
  public readonly app: Application;
  public readonly mount: HTMLElement;
  public readonly manualRender: boolean;
  /**
   * Root container for normal HUD views.
   * Everything attached here will render below `overlayLayer`.
   */
  public readonly contentLayer: Container;
  /**
   * Top-most HUD overlay container (always on top of `contentLayer`).
   * The stats panel is attached here.
   */
  public readonly overlayLayer: Container;

  private _statsRoot: Container | null = null;
  private _statsBg: Graphics | null = null;
  private _statsText: Text | null = null;
  private _statsVisible = false;
  private _lastLogicalWidth = 1;
  private _lastLogicalHeight = 1;
  private _lastDpr = 1;
  private readonly _logger: ILogger;

  private constructor(app: Application, mount: HTMLElement, manualRender: boolean, logger: ILogger) {
    this.app = app;
    this.mount = mount;
    this.manualRender = manualRender;

    // Stage layers: keep overlay always on top, regardless of future HUD view attachments.
    // Use zIndex sorting so add order doesn't matter.
    this.app.stage.sortableChildren = true;

    this.contentLayer = new Container();
    this.contentLayer.zIndex = 0;

    this.overlayLayer = new Container();
    this.overlayLayer.zIndex = 1000;

    this.app.stage.addChild(this.contentLayer);
    this.app.stage.addChild(this.overlayLayer);

    const r = (this.app.renderer as any).resolution;
    if (typeof r === "number" && Number.isFinite(r)) this._lastDpr = r;

    this._logger = logger;
  }

  public static async create(mount: HTMLElement, options: HudCreateOptions = {}): Promise<Hud> {
    const app = new Application();

    const resolution = Math.min(options.resolution ?? (globalThis.devicePixelRatio || 1), 2);
    const manualRender = options.manualRender ?? false;

    // Build init options without passing `undefined` properties.
    // (This repo uses `exactOptionalPropertyTypes`, so `canvas: undefined` is a type error.)
    const initOptions: any = {
      width: 1,
      height: 1,
      antialias: options.antialias ?? true,
      backgroundAlpha: options.backgroundAlpha ?? 0,
      resolution,
      // In shared-canvas mode, another renderer (e.g. Three.js) controls the drawing buffer sizing.
      // Keep Pixi from applying its own density logic to the shared canvas.
      autoDensity: options.canvas ? false : true,
      preference: options.preference ?? "webgl",
      // In shared-context mode, Pixi must not clear the 3D pass.
      clearBeforeRender: options.context ? false : true,
      // If we're manually rendering, don't auto-start Pixi's rAF loop.
      autoStart: manualRender ? false : true,
      layout: {
        layout: {
          autoUpdate: true,
          enableDebug: false,
          debugModificationCount: 0,
          throttle: 100
        }
      }
    };

    if (options.canvas) initOptions.canvas = options.canvas;
    if (options.context) initOptions.context = options.context;

    await app.init(initOptions);

    // IMPORTANT: @pixi/layout loads Yoga asynchronously.
    // Pixi's `app.init()` does not guarantee async system init is complete before returning,
    // so ensure Yoga is ready before any views set `.layout = ...`.
    await app.renderer.layout.init({
      layout: {
        autoUpdate: true,
        enableDebug: false,
        debugModificationCount: 0,
        throttle: 100
      }
    });

    const canvas = app.canvas as unknown as HTMLCanvasElement;

    const className = (options.canvasClassName ?? "layer hud2d").trim();
    if (className) canvas.classList.add(...className.split(/\s+/g));

    // Only attach if Pixi created the canvas (or if the provided canvas isn't already connected).
    if (!canvas.isConnected) mount.appendChild(canvas);

    // Ensure Pixi isn't rendering behind our back in manual-render mode.
    if (manualRender) {
      // Stop any internal ticker if it was created.
      app.ticker?.stop();
    }

    const logger = options.logger ?? Hud.createConsoleLogger();
    return new Hud(app, mount, manualRender, logger);
  }

  public attachChild(child: any, parent: any): void {
    const p = parent as any;
    const v = child as any;

    // Allow `null` to mean "attach to HUD root".
    if (p === null) {
      this.contentLayer.addChild(v);
      return;
    }

    // Support any Pixi container-like parent with `.addChild()`.
    if (p && typeof p.addChild === "function") {
      p.addChild(v);
      return;
    }

    throw new Error("Invalid HUD parent: expected a Pixi Container with .addChild(), or null");
  }

  public resize(width: number, height: number, dpr?: number): void {
    this._lastLogicalWidth = width;
    this._lastLogicalHeight = height;

    // Keep Pixi resolution in sync with the WebGL drawing buffer scaling.
    if (typeof dpr === "number" && Number.isFinite(dpr)) {
      // Pixi's renderer exposes `resolution` across backends.
      (this.app.renderer as any).resolution = dpr;
      this._lastDpr = dpr;
    } else {
      const r = (this.app.renderer as any).resolution;
      if (typeof r === "number" && Number.isFinite(r)) this._lastDpr = r;
    }

    this.app.renderer.resize(Math.max(1, Math.floor(width)), Math.max(1, Math.floor(height)));
    this.updateStatsText();
  }

  public showStats(show: boolean): void {
    this._statsVisible = show;

    if (show && !this._statsRoot) {
      this.createStatsPanel();
      this.updateStatsText();
    }

    if (this._statsRoot) this._statsRoot.visible = show;
  }

  public get logger(): ILogger {
    return this._logger;
  }

  private static createConsoleLogger(): ILogger {
    return {
      get isVisible(): boolean {
        return false;
      },
      show(_show: boolean): void {},
      log(message: string): void {
        console.log(message);
      }
    };
  }

  private createStatsPanel(): void {
    const root = new Container();
    root.visible = this._statsVisible;
    root.x = 8;
    root.y = 8;

    const bg = new Graphics();
    const text = new Text({
      text: "",
      style: new TextStyle({
        fill: 0xffffff,
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 12
      })
    });

    text.x = 8;
    text.y = 6;

    root.addChild(bg);
    root.addChild(text);

    this.overlayLayer.addChild(root);

    this._statsRoot = root;
    this._statsBg = bg;
    this._statsText = text;
  }

  private updateStatsText(): void {
    if (!this._statsVisible || !this._statsText || !this._statsBg) return;

    const w = Math.max(1, Math.floor(this._lastLogicalWidth));
    const h = Math.max(1, Math.floor(this._lastLogicalHeight));
    const dpr = Number.isFinite(this._lastDpr) ? Math.round(this._lastDpr * 100) / 100 : 1;
    this._statsText.text = `STATS\nWidth  : ${w}\nHeight : ${h}\nDPR    : ${dpr}`;

    const paddingX = 8;
    const paddingY = 6;
    const textW = Math.ceil(this._statsText.width);
    const textH = Math.ceil(this._statsText.height);
    const boxW = paddingX + textW + paddingX;
    const boxH = paddingY + textH + paddingY;

    this._statsBg.clear();
    this._statsBg.roundRect(0, 0, boxW, boxH, 6);
    this._statsBg.fill({ color: 0x000000, alpha: 0.45 });
  }

  /**
   * Manual render hook for shared-context mode.
   * Call this after rendering your 3D scene.
   */
  public render(): void {
    // Reset state before switching renderers (important when sharing a WebGL context).
    (this.app.renderer as any).resetState?.();

    // Do NOT clear; 3D pass is already in the color buffer.
    (this.app.renderer as any).render?.({ container: this.app.stage, clear: false });
  }

  public destroy(): void {
    // Remove canvas + destroy children/textures for a clean teardown.
    this.app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
  }
}

