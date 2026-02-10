import type { GamelabsAppConfig, GamelabsAppMode } from "./types.js";

export class GamelabsApp {
  readonly mode: GamelabsAppMode;
  readonly canvas: HTMLCanvasElement;

  private _width: number | undefined;
  private _height: number | undefined;

  constructor(config: GamelabsAppConfig) {
    this.mode = config.mode;
    this.canvas = config.canvas ?? document.createElement("canvas");
    this._width = config.width;
    this._height = config.height;
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
}

