import "@pixi/layout";
import { Application, Container, type ApplicationOptions } from "pixi.js";
import type { ILogger } from "../dev/ILogger.js";
import type { IHud } from "./IHud.js";
import type { HudViewBase } from "./HudViewBase.js";

export type HudCreateOptions = {
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
   * Optional logger for error logging.
   */
  logger?: ILogger;
};

export class Hud implements IHud {
  public readonly app: Application;
  public readonly mount: HTMLElement;
  private readonly _logger: ILogger | null = null;
  /**
   * Root container for normal HUD views.
   * Everything attached here will render below `overlayLayer`.
   */
  public readonly contentLayer: Container;
  /**
   * Top-most HUD overlay container (always on top of `contentLayer`).
   */
  public readonly overlayLayer: Container;

  private constructor(app: Application, mount: HTMLElement, logger: ILogger | null) {
    this.app = app;
    this.mount = mount;
    this._logger = logger;

    // Stage layers: keep overlay always on top, regardless of future HUD view attachments.
    // Use zIndex sorting so add order doesn't matter.
    this.app.stage.sortableChildren = true;

    this.contentLayer = new Container();
    this.contentLayer.zIndex = 0;

    this.overlayLayer = new Container();
    this.overlayLayer.zIndex = 1000;

    this.app.stage.addChild(this.contentLayer);
    this.app.stage.addChild(this.overlayLayer);
  }

  public static async create(mount: HTMLElement, options: HudCreateOptions = {}): Promise<Hud> {
    const app = new Application();

    const resolution = Math.min(options.resolution ?? (globalThis.devicePixelRatio || 1), 2);

    const initOptions: Partial<ApplicationOptions> = {
      width: 1,
      height: 1,
      antialias: options.antialias ?? true,
      backgroundAlpha: options.backgroundAlpha ?? 0,
      resolution,
      autoDensity: true,
      preference: options.preference ?? "webgl",
      layout: {
        layout: {
          autoUpdate: true,
          enableDebug: false,
          debugModificationCount: 0,
          throttle: 100,
        },
      },
    };

    await app.init(initOptions);

    // IMPORTANT: @pixi/layout loads Yoga asynchronously.
    // Pixi's `app.init()` does not guarantee async system init is complete before returning,
    // so ensure Yoga is ready before any views set `.layout = ...`.
    await app.renderer.layout.init({
      layout: {
        autoUpdate: true,
        enableDebug: false,
        debugModificationCount: 0,
        throttle: 100,
      },
    });

    const canvas = app.canvas as unknown as HTMLCanvasElement;

    const className = (options.canvasClassName ?? "layer hud2d").trim();
    if (className) canvas.classList.add(...className.split(/\s+/g));

    if (!canvas.isConnected) mount.appendChild(canvas);

    return new Hud(app, mount, options.logger ?? null);
  }

  addView(view: HudViewBase): void {
    this.contentLayer.addChild(view);
  }

  removeView(view: HudViewBase): void {
    this.contentLayer.removeChild(view);
  }

  public resize(width: number, height: number): void {
    this.app.renderer.resize(Math.max(1, Math.floor(width)), Math.max(1, Math.floor(height)));
  }

  public destroy(): void {
    // Remove canvas + destroy children/textures for a clean teardown.
    this.app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
  }
}
