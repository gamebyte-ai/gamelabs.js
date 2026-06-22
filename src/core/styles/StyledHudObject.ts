import type { TextStyleFontWeight, TextStyleOptions, Texture } from "pixi.js";
import { Container, NineSliceSprite, Sprite, Text } from "pixi.js";
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
 * - {@link _buildStyledSprite} / {@link _applyPartialSpriteStyle} —
 *   build a center-anchored sprite from a partial `SpriteStyle`, or
 *   patch only the set fields onto an existing one. Missing fields
 *   keep Pixi's intrinsic values (`tint = 0xffffff`, `alpha = 1`,
 *   `scaleX/Y = 1`, `border = 0`); a missing `textureId` falls back
 *   to the asset manager's default HUD texture so the sprite always
 *   has something to render.
 * - {@link _buildStyledText} / {@link _applyPartialTextStyle} — same
 *   partial-apply contract for `Text`. Pixi fills any unset
 *   field with its built-in default (`Arial`, `26px`, `0x000000`).
 *
 * Apps that want a properly themed look register a complete style
 * entry on `StyleManager` via the module binding so the partial
 * patches resolve to fully-populated styles at runtime.
 */
export abstract class StyledHudObject<TStyle> extends Container {
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
  protected _getTexture(textureId: string): Texture {
    const texture = this._assetManager.getAsset<Texture>(textureId);
    if (!texture) {
      throw new Error(
        `${this.constructor.name}: texture '${textureId}' not loaded — register an asset request for this id before the app boots`,
      );
    }
    return texture;
  }

  /**
   * Builds a center-anchored sprite from a partial {@link SpriteStyle}.
   * Missing fields stay at Pixi's intrinsic values (`tint = 0xffffff`,
   * `alpha = 1`, `scaleX/Y = 1`, `border = 0`); a missing `textureId`
   * falls back to the asset manager's 1×1 default HUD texture so the
   * sprite still has a renderable texture.
   *
   * The sprite type (`Sprite` vs `NineSliceSprite`) is fixed
   * at build time by `style?.border`; subsequent partial-apply calls
   * cannot change it.
   */
  protected _buildStyledSprite(
    style: SpriteStyle | undefined,
    slotWidth: number,
    slotHeight: number = slotWidth,
  ): Sprite | NineSliceSprite {
    const border = style?.border ?? 0;
    const texture = style?.textureId !== undefined ? this._getTexture(style.textureId) : this._assetManager.getDefaultHudTexture();
    const sprite: Sprite | NineSliceSprite =
      border > 0
        ? new NineSliceSprite({
            texture,
            leftWidth: border,
            topHeight: border,
            rightWidth: border,
            bottomHeight: border,
          })
        : new Sprite(texture);
    sprite.anchor.set(0.5, 0.5);
    this._applyPartialSpriteStyle(sprite, style, slotWidth, slotHeight);
    return sprite;
  }

  /**
   * Patches an existing sprite with the fields set on `style`. Skips
   * any field that is `undefined`, leaving the sprite's current value
   * in place. `width` / `height` are always written (they're host-slot
   * geometry, not style data) — `scaleX/Y` defaults to `1` when unset
   * so the sprite fills its slot. Throws if `style.textureId` is set
   * but the asset isn't loaded.
   */
  protected _applyPartialSpriteStyle(
    sprite: Sprite | NineSliceSprite,
    style: SpriteStyle | undefined,
    slotWidth: number,
    slotHeight: number = slotWidth,
  ): void {
    if (style?.textureId !== undefined) {
      const texture = this._getTexture(style.textureId);
      if (sprite.texture !== texture) sprite.texture = texture;
    }
    if (style?.color !== undefined) sprite.tint = style.color;
    if (style?.alpha !== undefined) sprite.alpha = style.alpha;
    sprite.width = slotWidth * (style?.scaleX ?? 1);
    sprite.height = slotHeight * (style?.scaleY ?? 1);
  }

  /**
   * Builds a Pixi `Text` node from a partial {@link TextStyle}. Only
   * fields that are set on `style` are passed to the `Text`
   * constructor — Pixi fills the rest with its built-in defaults
   * (`fontFamily: "Arial"`, `fontSize: 26`, etc.). Apps that want a
   * proper themed look register the desired defaults on the
   * `StyleManager` (e.g. via a module binding) so the resolved style
   * has every field set.
   *
   * Anchor is left at Pixi's default `(0, 0)` — callers set it
   * explicitly if needed.
   */
  protected _buildStyledText(content: string, style: TextStyle | undefined): Text {
    const pixiStyle: Partial<TextStyleOptions> = {};
    if (style?.fontFamily !== undefined) pixiStyle.fontFamily = style.fontFamily;
    if (style?.fontSize !== undefined) pixiStyle.fontSize = style.fontSize;
    if (style?.fontWeight !== undefined) pixiStyle.fontWeight = style.fontWeight as TextStyleFontWeight;
    if (style?.color !== undefined) pixiStyle.fill = style.color;
    if (style?.letterSpacing !== undefined) pixiStyle.letterSpacing = style.letterSpacing;
    const text = new Text({ text: content, style: pixiStyle });
    if (style?.alpha !== undefined) text.alpha = style.alpha;
    return text;
  }

  /**
   * Patches an existing `Text` node with the fields set on
   * `style`. Skips any field that is `undefined`, leaving the text's
   * current value in place. Useful for runtime restyling that wants to
   * tweak a single field (e.g. tint a label red on hover) without
   * re-baking everything else.
   */
  protected _applyPartialTextStyle(text: Text, style: TextStyle | undefined): void {
    if (style?.fontFamily !== undefined) text.style.fontFamily = style.fontFamily;
    if (style?.fontSize !== undefined) text.style.fontSize = style.fontSize;
    if (style?.fontWeight !== undefined) text.style.fontWeight = style.fontWeight as TextStyleFontWeight;
    if (style?.color !== undefined) text.style.fill = style.color;
    if (style?.letterSpacing !== undefined) text.style.letterSpacing = style.letterSpacing;
    if (style?.alpha !== undefined) text.alpha = style.alpha;
  }
}
