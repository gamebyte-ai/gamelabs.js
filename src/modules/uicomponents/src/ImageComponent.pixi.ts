import type { LayoutOptions } from "@pixi/layout";
import * as PIXI from "pixi.js";
import type { IAssetManager } from "../../../core/assets/IAssetManager.js";

export type ImageComponentPreset = {
  /** X position. */
  x?: number;
  /** Y position. */
  y?: number;
  /** Fixed width. Accepts a number or a percentage string like "100%". */
  width?: LayoutOptions["width"];
  /** Fixed height. Accepts a number or a percentage string like "100%". */
  height?: LayoutOptions["height"];
  /** Asset ID for the texture. Resolved via `resolveAssets()`. */
  textureId?: string;
  /**
   * How to fit the texture inside the component bounds.
   * - "contain": preserve aspect ratio, fit entirely inside (may leave empty space).
   * - "cover": preserve aspect ratio, fill bounds (may crop overflow).
   * - "stretch": ignore aspect ratio, stretch to fill.
   * @default "contain"
   */
  fit?: "contain" | "cover" | "stretch";
  /**
   * Padding factor applied to the fit calculation (0-1).
   * E.g. 0.96 leaves a 4% margin around the image. Ignored when fit is "stretch".
   * @default 1
   */
  padding?: number;
};

/**
 * Parse a JSON string into ImageComponentPreset.
 */
export function parseImageComponentPreset(json: string): ImageComponentPreset {
  return JSON.parse(json) as ImageComponentPreset;
}

/**
 * Reusable image component.
 *
 * - Fits a texture into a layout-managed box using contain/cover/stretch.
 * - Redraws on layout changes and when a new texture is set.
 * - Texture can be resolved from an `IAssetManager` via `resolveAssets()`.
 */
export class ImageComponent extends PIXI.Container {
  private readonly _sprite: PIXI.Sprite;
  private readonly _textureId: string | undefined;
  private readonly _fit: "contain" | "cover" | "stretch";
  private readonly _padding: number;

  private _boxWidth = 0;
  private _boxHeight = 0;

  constructor(opts: ImageComponentPreset = {}) {
    super();

    this._textureId = opts.textureId;
    this._fit = opts.fit ?? "contain";
    this._padding = opts.padding ?? 1;

    if (opts.x !== undefined) this.x = opts.x;
    if (opts.y !== undefined) this.y = opts.y;

    this._sprite = new PIXI.Sprite(PIXI.Texture.EMPTY);
    this._sprite.anchor.set(0.5, 0.5);
    this._sprite.visible = false;
    this.addChild(this._sprite);

    this.layout = {
      ...(opts.width !== undefined ? { width: opts.width } : {}),
      ...(opts.height !== undefined ? { height: opts.height } : {}),
    };

    this.on("layout", (l: any) => {
      this._boxWidth = Math.max(1, Math.floor(l.computedLayout.width));
      this._boxHeight = Math.max(1, Math.floor(l.computedLayout.height));
      this.applyFit();
    });
  }

  /** Resolve the texture from the asset manager. */
  public resolveAssets(assetManager: IAssetManager): void {
    if (!this._textureId) return;
    const texture = assetManager.getAsset<PIXI.Texture>(this._textureId);
    if (texture) this.setTexture(texture);
  }

  /** Set the texture directly. */
  public setTexture(texture: PIXI.Texture): void {
    this._sprite.texture = texture;
    this._sprite.visible = texture !== PIXI.Texture.EMPTY;
    this.applyFit();
  }

  private applyFit(): void {
    if (this._sprite.texture === PIXI.Texture.EMPTY) return;
    if (this._boxWidth <= 0 || this._boxHeight <= 0) return;

    const w = this._boxWidth;
    const h = this._boxHeight;
    const tw = Math.max(1, this._sprite.texture.width);
    const th = Math.max(1, this._sprite.texture.height);

    let scaleX: number;
    let scaleY: number;

    if (this._fit === "stretch") {
      scaleX = w / tw;
      scaleY = h / th;
    } else {
      const pad = this._padding;
      const fx = (w * pad) / tw;
      const fy = (h * pad) / th;
      const scale = this._fit === "contain" ? Math.min(fx, fy) : Math.max(fx, fy);
      scaleX = scale;
      scaleY = scale;
    }

    this._sprite.scale.set(scaleX, scaleY);
    this._sprite.position.set(w / 2, h / 2);
  }
}
