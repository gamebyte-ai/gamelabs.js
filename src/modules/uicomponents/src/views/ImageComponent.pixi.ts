import "@pixi/layout";
import type { Layout, LayoutOptions } from "@pixi/layout";
import * as PIXI from "pixi.js";
import type { AssetManager } from "../../../../core/assets/AssetManager.js";
import type { SpriteStyle } from "../../../../core/styles/SpriteStyle.js";
import { StyledHudObject } from "../../../../core/styles/StyledHudObject.js";
import type { ImageComponentStyle } from "../UIComponentsStyleTypes.js";

/**
 * Geometry / fit options for an {@link ImageComponent}. Visual styling
 * (tint, alpha, per-axis scale, optional default `textureId`) lives on
 * the {@link ImageComponentStyle} passed alongside the asset manager
 * and is owned by the framework's `StyleManager`.
 */
export type ImageComponentOpts = {
  /** X position. */
  x?: number;
  /** Y position. */
  y?: number;
  /** Fixed width. Accepts a number or a percentage string like "100%". */
  width?: LayoutOptions["width"];
  /** Fixed height. Accepts a number or a percentage string like "100%". */
  height?: LayoutOptions["height"];
  /**
   * Asset id for the per-instance content texture. Resolved eagerly at
   * construction. Wins over `style.image.textureId` when both are set.
   * Use `style.image.textureId` instead when you want a default that
   * apps can re-theme via `styleManager.modify(...)`; use this opt when
   * the texture is purely per-screen content (e.g. a logo).
   */
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
   * Padding factor applied to the fit calculation (0-1). E.g. 0.96
   * leaves a 4% margin around the image. Ignored when fit is "stretch".
   * @default 1
   */
  padding?: number;
};

const DEFAULT_COLOR = 0xffffff;
const DEFAULT_ALPHA = 1;
const DEFAULT_SCALE = 1;

/**
 * Reusable image component, themed via the framework's style system.
 *
 * Construction takes an `AssetManager`, a fully-resolved
 * {@link ImageComponentStyle}, and geometry / fit options:
 *
 * ```ts
 * // In a HudViewBase / ScreenView / PopupView subclass — the base class
 * // exposes `styleManager` and `assetLoader` getters for free:
 * const imageStyle = this.styleManager.resolve<ImageComponentStyle>(UIComponentsStyleIds.Image);
 * const logo = new ImageComponent(this.assetLoader, imageStyle, {
 *   width: 520,
 *   height: 140,
 *   textureId: MyAppAssetIds.Logo,
 *   fit: "contain",
 *   padding: 0.96,
 * });
 *
 * // Theme tint app-wide:
 * styleManager.modify(UIComponentsStyleIds.Image, { image: { color: 0xf59e0b } });
 *
 * // Per-instance tint without touching the global default:
 * const tintedStyle = this.styleManager.resolve<ImageComponentStyle>(
 *   UIComponentsStyleIds.Image,
 *   { image: { color: 0xf59e0b, alpha: 0.85 } },
 * );
 * const tinted = new ImageComponent(this.assetLoader, tintedStyle, {
 *   textureId: MyAppAssetIds.Hero,
 *   width: 200, height: 200,
 * });
 * ```
 *
 * The texture is *content*, not skin — most apps supply it per-call
 * via `ImageComponentOpts.textureId` (or pre-resolved `texture` later
 * with {@link setTexture}). The style mostly carries cosmetic defaults
 * (tint, alpha) that flow through the framework's `StyleManager` so
 * apps can re-theme every Image at once. `style.image.textureId` is
 * still honoured when set — useful for default placeholders or theme
 * skins — but `opts.textureId` always wins when both are present.
 *
 * Fit / cover / stretch math runs in the component itself rather than
 * via `_buildSprite`'s slot sizing, because the helper stretches to a
 * fixed slot whereas Image preserves aspect ratio (or matches the box
 * exactly) based on `opts.fit`.
 */
export class ImageComponent extends StyledHudObject<ImageComponentStyle> {
  private readonly _sprite: PIXI.Sprite;
  private readonly _imageStyle: Required<SpriteStyle>;
  private readonly _fit: "contain" | "cover" | "stretch";
  private readonly _padding: number;

  private _boxWidth = 0;
  private _boxHeight = 0;

  public constructor(assetManager: AssetManager, style: ImageComponentStyle, opts: ImageComponentOpts = {}) {
    super(assetManager, style);

    this._fit = opts.fit ?? "contain";
    this._padding = opts.padding ?? 1;

    if (opts.x !== undefined) this.x = opts.x;
    if (opts.y !== undefined) this.y = opts.y;

    // Resolve the slot manually rather than via `_resolveSpriteStyle`
    // because `textureId` is optional for Image (the helper requires a
    // non-empty default). Per-instance opts.textureId wins over the
    // style's textureId — content beats skin defaults.
    const slot = style.image;
    const resolvedTextureId = opts.textureId ?? slot?.textureId;
    this._imageStyle = {
      textureId: resolvedTextureId ?? "",
      color: slot?.color ?? DEFAULT_COLOR,
      alpha: slot?.alpha ?? DEFAULT_ALPHA,
      scaleX: slot?.scaleX ?? DEFAULT_SCALE,
      scaleY: slot?.scaleY ?? DEFAULT_SCALE,
      border: slot?.border ?? 0,
    };

    const initialTexture = resolvedTextureId ? this._getTexture(resolvedTextureId) : PIXI.Texture.EMPTY;
    this._sprite = new PIXI.Sprite(initialTexture);
    this._sprite.anchor.set(0.5, 0.5);
    this._sprite.tint = this._imageStyle.color;
    this._sprite.alpha = this._imageStyle.alpha;
    this._sprite.visible = initialTexture !== PIXI.Texture.EMPTY;
    this.addChild(this._sprite);

    this.layout = {
      ...(opts.width !== undefined ? { width: opts.width } : {}),
      ...(opts.height !== undefined ? { height: opts.height } : {}),
    };

    this.on("layout", (l: Layout) => this._handleLayout(l));
  }

  /**
   * Replace the rendered texture at runtime. The fit / cover / stretch
   * math re-runs against the current layout box.
   */
  public setTexture(texture: PIXI.Texture): void {
    this._sprite.texture = texture;
    this._sprite.visible = texture !== PIXI.Texture.EMPTY;
    this._applyFit();
  }

  /**
   * Convenience: look up a texture by id via the asset manager and
   * apply it. Throws if the asset isn't loaded.
   */
  public setTextureId(textureId: string): void {
    this.setTexture(this._getTexture(textureId));
  }

  private _handleLayout(l: Layout): void {
    this._boxWidth = Math.max(1, Math.floor(l.computedLayout.width));
    this._boxHeight = Math.max(1, Math.floor(l.computedLayout.height));
    this._applyFit();
  }

  private _applyFit(): void {
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

    // The style's per-axis scale composes on top of the fit scale —
    // useful for apps that want a bit of zoom or letterboxing tuning
    // without overriding the chosen fit semantics.
    this._sprite.scale.set(scaleX * this._imageStyle.scaleX, scaleY * this._imageStyle.scaleY);
    this._sprite.position.set(w / 2, h / 2);
  }
}
