import * as PIXI from "pixi.js";
import type { AssetManager } from "../assets/AssetManager.js";
import type { SpriteStyle } from "./SpriteStyle.js";

/**
 * Base class for self-rendering, style-driven HUD widgets. Subclasses
 * paint themselves once at construction from `style` and an
 * `AssetManager` for texture lookups.
 *
 * Runtime restyling is intentionally not part of the contract yet —
 * the style is captured once and the widget is otherwise immutable
 * with respect to its theme. A `changeStyle` method can be added when
 * a real use case lands.
 *
 * Provides three sprite-rendering primitives shared across textured
 * HUD widgets:
 * - {@link _getTexture} — asset lookup with a subclass-named error.
 * - {@link _resolveSpriteStyle} — fills missing fields on a partial
 *   `SpriteStyle` from caller-supplied defaults.
 * - {@link _buildSprite} / {@link _applySpriteStyle} — build or
 *   update a square center-anchored sprite sized to
 *   `slotSize * scaleX/Y`.
 */
export abstract class StyledHudObject<TStyle> extends PIXI.Container {
  protected readonly _assetManager: AssetManager;
  protected readonly _style: TStyle;

  protected constructor(assetManager: AssetManager, style: TStyle) {
    super();
    this._assetManager = assetManager;
    this._style = style;
  }

  /**
   * Looks up a texture by id. Throws with the subclass class name if
   * the asset hasn't been loaded — register an asset request for the
   * id at app boot.
   */
  protected _getTexture(textureId: string): PIXI.Texture {
    const texture = this._assetManager.getAsset<PIXI.Texture>(textureId);
    if (!texture) {
      throw new Error(
        `${this.constructor.name}: texture '${textureId}' not loaded — register an asset request for this id before the app boots`,
      );
    }
    return texture;
  }

  /**
   * Fills missing fields on a partial {@link SpriteStyle} with the
   * supplied defaults, returning a fully-resolved style.
   */
  protected _resolveSpriteStyle(
    style: SpriteStyle | undefined,
    defaultTextureId: string,
    defaultColor: number,
    defaultAlpha: number,
    defaultScaleX: number,
    defaultScaleY: number,
  ): Required<SpriteStyle> {
    return {
      textureId: style?.textureId ?? defaultTextureId,
      color: style?.color ?? defaultColor,
      alpha: style?.alpha ?? defaultAlpha,
      scaleX: style?.scaleX ?? defaultScaleX,
      scaleY: style?.scaleY ?? defaultScaleY,
    };
  }

  /**
   * Builds a center-anchored sprite from a resolved style. Width and
   * height are `slotSize * scaleX` and `slotSize * scaleY` so the
   * sprite is sized relative to a host slot whose reference dim is
   * `slotSize`. Throws via {@link _getTexture} if the texture is
   * missing.
   */
  protected _buildSprite(style: Required<SpriteStyle>, slotSize: number): PIXI.Sprite {
    const sprite = new PIXI.Sprite(this._getTexture(style.textureId));
    sprite.anchor.set(0.5, 0.5);
    this._applySpriteStyle(sprite, style, slotSize);
    return sprite;
  }

  /**
   * Updates an existing sprite to a new resolved style — texture
   * swap if different, plus tint, alpha, and per-axis dim. Throws if
   * the new texture id is unloaded.
   */
  protected _applySpriteStyle(sprite: PIXI.Sprite, style: Required<SpriteStyle>, slotSize: number): void {
    const texture = this._getTexture(style.textureId);
    if (sprite.texture !== texture) sprite.texture = texture;
    sprite.tint = style.color;
    sprite.alpha = style.alpha;
    sprite.width = slotSize * style.scaleX;
    sprite.height = slotSize * style.scaleY;
  }
}
