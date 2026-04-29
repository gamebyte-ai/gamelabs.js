import "@pixi/layout";
import type { Layout } from "@pixi/layout";
import * as PIXI from "pixi.js";
import type { AssetManager } from "../../../../core/assets/AssetManager.js";
import type { SpriteStyle } from "../../../../core/styles/SpriteStyle.js";
import { StyledHudObject } from "../../../../core/styles/StyledHudObject.js";
import { UIComponentsAssetIds } from "../UIComponentsAssetIds.js";
import type { BackgroundComponentStyle } from "../UIComponentsStyleTypes.js";

/**
 * Geometry / overlay options for a {@link BackgroundComponent}. The
 * background texture lives on the {@link BackgroundComponentStyle}
 * passed alongside the asset manager and is owned by the framework's
 * `StyleManager`. The overlay and fallback colours stay here because
 * they are per-screen UI tuning rather than themable skin data.
 */
export type BackgroundComponentOpts = {
  /** Overlay color drawn on top of the texture (for UI readability). @default 0x000000 */
  overlayColor?: number;
  /** Overlay alpha when the texture is present. @default 0.12 */
  overlayAlpha?: number;
  /** Fallback color used when no texture is loaded. @default 0x020617 */
  fallbackColor?: number;
  /** Fallback alpha used when no texture is loaded. @default 0.55 */
  fallbackAlpha?: number;
};

const DEFAULT_OVERLAY_COLOR = 0x000000;
const DEFAULT_OVERLAY_ALPHA = 0.12;
const DEFAULT_FALLBACK_COLOR = 0x020617;
const DEFAULT_FALLBACK_ALPHA = 0.55;

const DEFAULT_BG_COLOR = 0xffffff;
const DEFAULT_BG_ALPHA = 1;
const DEFAULT_BG_SCALE = 1;
const DEFAULT_BG_BORDER = 0;

/**
 * Reusable full-screen background component, themed via the framework's
 * style system. Construction takes an `AssetManager`, a fully-resolved
 * {@link BackgroundComponentStyle}, and overlay / fallback opts:
 *
 * ```ts
 * const backgroundStyle = this.styleManager.resolve<BackgroundComponentStyle>(
 *   UIComponentsStyleIds.Background,
 *   // optional override — typical for app screens that ship their own backdrop
 *   { bg: { textureId: MyAppAssetIds.MainScreenBg } },
 * );
 * const background = new BackgroundComponent(this.assetLoader, backgroundStyle, {
 *   overlayAlpha: 0.18,
 * });
 * ```
 *
 * Renders the resolved bg texture cover-scaled (preserves aspect ratio,
 * centred) into its layout box, with a semi-transparent overlay on top
 * for UI readability. The cover-fit math runs in the component itself
 * rather than delegating to `StyledHudObject._buildSprite` because the
 * helper stretches the sprite to a slot size, whereas backgrounds need
 * to overflow + crop along whichever axis is over-sized.
 *
 * Tint flows through `Container.tint` and applies to the bg sprite
 * (overlay/fallback Graphics layers also respect Container.tint, so a
 * single `bg.tint = 0xff0000` reddens the whole composite).
 */
export class BackgroundComponent extends StyledHudObject<BackgroundComponentStyle> {
  private readonly _bgSprite: PIXI.Sprite;
  private readonly _overlay: PIXI.Graphics;
  private readonly _bgStyle: Required<SpriteStyle>;
  private readonly _overlayColor: number;
  private readonly _overlayAlpha: number;
  private readonly _fallbackColor: number;
  private readonly _fallbackAlpha: number;

  private _width = 0;
  private _height = 0;

  public constructor(assetManager: AssetManager, style: BackgroundComponentStyle, opts: BackgroundComponentOpts = {}) {
    super(assetManager, style);

    this._overlayColor = opts.overlayColor ?? DEFAULT_OVERLAY_COLOR;
    this._overlayAlpha = opts.overlayAlpha ?? DEFAULT_OVERLAY_ALPHA;
    this._fallbackColor = opts.fallbackColor ?? DEFAULT_FALLBACK_COLOR;
    this._fallbackAlpha = opts.fallbackAlpha ?? DEFAULT_FALLBACK_ALPHA;

    this._bgStyle = this._resolveSpriteStyle(
      style.bg,
      UIComponentsAssetIds.DefaultBackground,
      DEFAULT_BG_COLOR,
      DEFAULT_BG_ALPHA,
      DEFAULT_BG_SCALE,
      DEFAULT_BG_SCALE,
      DEFAULT_BG_BORDER,
    );

    // Pull the texture eagerly via the base helper. This throws with a
    // clear error if the asset wasn't loaded — same contract as every
    // other StyledHudObject subclass.
    const bgTexture = this._getTexture(this._bgStyle.textureId);

    // The texture sprite is NOT under @pixi/layout control. We size and
    // position it manually for "cover" behaviour — Yoga would only
    // stretch, which would distort the texture along whichever axis is
    // over-sized.
    this._bgSprite = new PIXI.Sprite(bgTexture);
    this._bgSprite.tint = this._bgStyle.color;
    this._bgSprite.alpha = this._bgStyle.alpha;
    this.addChild(this._bgSprite);

    this._overlay = new PIXI.Graphics();
    this._overlay.layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };
    this.addChild(this._overlay);

    this.layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };

    this.on("layout", (l: Layout) => this.handleLayout(l));
  }

  private handleLayout(l: Layout): void {
    const w = Math.max(1, Math.floor(l.computedLayout.width));
    const h = Math.max(1, Math.floor(l.computedLayout.height));
    this._width = w;
    this._height = h;
    this.redraw();
  }

  private redraw(): void {
    const width = this._width;
    const height = this._height;
    if (width <= 0 || height <= 0) return;

    const tex = this._bgSprite.texture;
    if (tex !== PIXI.Texture.EMPTY) {
      this._bgSprite.visible = true;
      const tw = Math.max(1, tex.width);
      const th = Math.max(1, tex.height);
      // Cover: scale by the larger axis so the smaller dimension
      // overflows + crops, matching CSS `background-size: cover`.
      const scale = Math.max(width / tw, height / th);
      this._bgSprite.scale.set(scale, scale);
      this._bgSprite.position.set((width - tw * scale) / 2, (height - th * scale) / 2);

      this._overlay.clear();
      this._overlay.rect(0, 0, width, height).fill({ color: this._overlayColor, alpha: this._overlayAlpha });
      return;
    }

    // EMPTY-texture path — defensive only. With eager construction the
    // base `_getTexture` throws on a missing asset, so we shouldn't
    // reach here unless the texture was unloaded post-construction.
    this._bgSprite.visible = false;
    this._overlay.clear();
    this._overlay.rect(0, 0, width, height).fill({ color: this._fallbackColor, alpha: this._fallbackAlpha });
  }
}
