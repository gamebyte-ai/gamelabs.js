import "@pixi/layout";
import type { Layout } from "@pixi/layout";
import * as PIXI from "pixi.js";
import type { IAssetManager } from "../../../core/assets/IAssetManager.js";

export type BackgroundComponentPreset = {
  /** Asset ID for the background texture. Resolved via `resolveAssets()`. */
  bgTextureId?: string;
  /** Overlay color drawn on top of the texture (for UI readability). @default 0x000000 */
  overlayColor?: number;
  /** Overlay alpha when the texture is present. @default 0.12 */
  overlayAlpha?: number;
  /** Fallback color used when no texture is loaded. @default 0x020617 */
  fallbackColor?: number;
  /** Fallback alpha used when no texture is loaded. @default 0.55 */
  fallbackAlpha?: number;
};

/**
 * Parse a JSON string into BackgroundComponentPreset.
 */
export function parseBackgroundComponentPreset(json: string): BackgroundComponentPreset {
  return JSON.parse(json) as BackgroundComponentPreset;
}

/**
 * Reusable full-screen background component.
 *
 * - Fills its parent via absolute layout.
 * - Scales its texture to "cover" the viewport without distortion.
 * - Draws a subtle overlay on top for UI readability.
 * - Falls back to a solid color when no texture is loaded.
 */
export class BackgroundComponent extends PIXI.Container {
  private readonly _bgImage: PIXI.Sprite;
  private readonly _overlay: PIXI.Graphics;
  private readonly _opts: Required<Omit<BackgroundComponentPreset, "bgTextureId">>;
  private readonly _bgTextureId: string | undefined;

  private _width = 0;
  private _height = 0;

  constructor(opts: BackgroundComponentPreset = {}) {
    super();

    this._opts = {
      overlayColor: opts.overlayColor ?? 0x000000,
      overlayAlpha: opts.overlayAlpha ?? 0.12,
      fallbackColor: opts.fallbackColor ?? 0x020617,
      fallbackAlpha: opts.fallbackAlpha ?? 0.55,
    };
    this._bgTextureId = opts.bgTextureId;

    // IMPORTANT: the texture sprite is NOT under layout control.
    // We size/position it manually for "cover" behavior.
    this._bgImage = new PIXI.Sprite(PIXI.Texture.EMPTY);
    this._bgImage.visible = false;
    this.addChild(this._bgImage);

    this._overlay = new PIXI.Graphics();
    this._overlay.layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };
    this.addChild(this._overlay);

    this.layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };

    this.on("layout", (l: Layout) => {
      const w = Math.max(1, Math.floor(l.computedLayout.width));
      const h = Math.max(1, Math.floor(l.computedLayout.height));
      this._width = w;
      this._height = h;
      this.redraw();
    });
  }

  /** Resolve preset asset references (bgTextureId) from the asset manager. */
  public resolveAssets(assetManager: IAssetManager): void {
    if (!this._bgTextureId) return;
    const texture = assetManager.getAsset<PIXI.Texture>(this._bgTextureId);
    if (texture && this._bgImage.texture === PIXI.Texture.EMPTY) {
      this._bgImage.texture = texture;
      this.redraw();
    }
  }

  private redraw(): void {
    const width = this._width;
    const height = this._height;
    if (width <= 0 || height <= 0) return;

    if (this._bgImage.texture !== PIXI.Texture.EMPTY) {
      this._bgImage.visible = true;
      const tw = Math.max(1, this._bgImage.texture.width);
      const th = Math.max(1, this._bgImage.texture.height);
      const scale = Math.max(width / tw, height / th);
      this._bgImage.scale.set(scale, scale);
      this._bgImage.position.set((width - tw * scale) / 2, (height - th * scale) / 2);

      this._overlay.clear();
      this._overlay.rect(0, 0, width, height).fill({ color: this._opts.overlayColor, alpha: this._opts.overlayAlpha });
      return;
    }

    this._bgImage.visible = false;
    this._overlay.clear();
    this._overlay.rect(0, 0, width, height).fill({ color: this._opts.fallbackColor, alpha: this._opts.fallbackAlpha });
  }
}
