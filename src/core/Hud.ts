import "@pixi/layout";
import { Application, Container, type ApplicationOptions } from "pixi.js";
import type { IViewContainer } from "./views/IViewContainer.js";

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
   */
  public readonly overlayLayer: Container;

  private constructor(app: Application, mount: HTMLElement, manualRender: boolean) {
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

    return new Hud(app, mount, manualRender);
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
    // Keep Pixi resolution in sync with the WebGL drawing buffer scaling.
    if (typeof dpr === "number" && Number.isFinite(dpr)) {
      // Pixi's renderer exposes `resolution` across backends.
      (this.app.renderer as any).resolution = dpr;
    }

    this.app.renderer.resize(Math.max(1, Math.floor(width)), Math.max(1, Math.floor(height)));
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

