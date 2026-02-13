import { Application, type ApplicationOptions } from "pixi.js";

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
};

export class Hud {
  readonly app: Application;
  readonly mount: HTMLElement;

  private constructor(app: Application, mount: HTMLElement) {
    this.app = app;
    this.mount = mount;
  }

  static async create(mount: HTMLElement, options: HudCreateOptions = {}): Promise<Hud> {
    const app = new Application();

    const resolution = Math.min(options.resolution ?? (globalThis.devicePixelRatio || 1), 2);

    await app.init({
      width: 1,
      height: 1,
      antialias: options.antialias ?? true,
      backgroundAlpha: options.backgroundAlpha ?? 0,
      resolution,
      autoDensity: true,
      preference: options.preference ?? "webgl"
    });

    const canvas = app.canvas as unknown as HTMLCanvasElement;

    const className = (options.canvasClassName ?? "layer hud2d").trim();
    if (className) canvas.classList.add(...className.split(/\s+/g));

    mount.appendChild(canvas);

    return new Hud(app, mount);
  }

  resize(width: number, height: number): void {
    this.app.renderer.resize(Math.max(1, Math.floor(width)), Math.max(1, Math.floor(height)));
  }

  destroy(): void {
    // Remove canvas + destroy children/textures for a clean teardown.
    this.app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
  }
}

