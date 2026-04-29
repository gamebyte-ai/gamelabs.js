import * as PIXI from "pixi.js";
import type { AssetManager } from "../assets/AssetManager.js";
import type { SpriteStyle } from "./SpriteStyle.js";
import type { TextStyle } from "./TextStyle.js";

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
 * Provides primitives shared across textured + textual HUD widgets:
 * - {@link _getTexture} — asset lookup with a subclass-named error.
 * - {@link _resolveSpriteStyle} / {@link _buildSprite} /
 *   {@link _applySpriteStyle} — fill defaults on a partial
 *   `SpriteStyle`, build or update a center-anchored sprite sized to
 *   `slotWidth * scaleX` × `slotHeight * scaleY`.
 * - {@link _resolveTextStyle} / {@link _buildText} /
 *   {@link _applyTextStyle} — fill defaults on a partial `TextStyle`,
 *   build or update a Pixi `Text` node with the resolved fields.
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
   * Builds a center-anchored sprite from a resolved style. Width is
   * `slotWidth * scaleX`, height is `slotHeight * scaleY`. For a
   * square slot pass `slotWidth` only; `slotHeight` defaults to it.
   * Throws via {@link _getTexture} if the texture is missing.
   */
  protected _buildSprite(style: Required<SpriteStyle>, slotWidth: number, slotHeight: number = slotWidth): PIXI.Sprite {
    const sprite = new PIXI.Sprite(this._getTexture(style.textureId));
    sprite.anchor.set(0.5, 0.5);
    this._applySpriteStyle(sprite, style, slotWidth, slotHeight);
    return sprite;
  }

  /**
   * Updates an existing sprite to a new resolved style — texture
   * swap if different, plus tint, alpha, and per-axis dim. Throws if
   * the new texture id is unloaded.
   */
  protected _applySpriteStyle(sprite: PIXI.Sprite, style: Required<SpriteStyle>, slotWidth: number, slotHeight: number = slotWidth): void {
    const texture = this._getTexture(style.textureId);
    if (sprite.texture !== texture) sprite.texture = texture;
    sprite.tint = style.color;
    sprite.alpha = style.alpha;
    sprite.width = slotWidth * style.scaleX;
    sprite.height = slotHeight * style.scaleY;
  }

  /**
   * Fills missing fields on a partial {@link TextStyle} with the
   * supplied defaults, returning a fully-resolved style.
   */
  protected _resolveTextStyle(
    style: TextStyle | undefined,
    defaultFontFamily: string,
    defaultFontSize: number,
    defaultFontWeight: string,
    defaultColor: number,
    defaultAlpha: number,
  ): Required<TextStyle> {
    return {
      fontFamily: style?.fontFamily ?? defaultFontFamily,
      fontSize: style?.fontSize ?? defaultFontSize,
      fontWeight: style?.fontWeight ?? defaultFontWeight,
      color: style?.color ?? defaultColor,
      alpha: style?.alpha ?? defaultAlpha,
    };
  }

  /**
   * Builds a Pixi `Text` node from a resolved style. Anchor is left at
   * its Pixi default `(0, 0)` — callers set it explicitly if needed.
   */
  protected _buildText(content: string, style: Required<TextStyle>): PIXI.Text {
    const text = new PIXI.Text({
      text: content,
      style: {
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight as PIXI.TextStyleFontWeight,
        fill: style.color,
      },
    });
    text.alpha = style.alpha;
    return text;
  }

  /**
   * Updates an existing text node's style fields to match the resolved
   * style. Mutates the underlying `PIXI.TextStyle` so the text
   * re-renders on the next frame.
   */
  protected _applyTextStyle(text: PIXI.Text, style: Required<TextStyle>): void {
    text.style.fontFamily = style.fontFamily;
    text.style.fontSize = style.fontSize;
    text.style.fontWeight = style.fontWeight as PIXI.TextStyleFontWeight;
    text.style.fill = style.color;
    text.alpha = style.alpha;
  }
}
