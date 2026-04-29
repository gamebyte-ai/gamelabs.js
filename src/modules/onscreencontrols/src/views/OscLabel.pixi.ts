import type * as PIXI from "pixi.js";
import type { AssetManager } from "../../../../core/assets/AssetManager.js";
import { StyledHudObject } from "../../../../core/styles/StyledHudObject.js";
import type { OscLabelStyle } from "../OnScreenControlTypes.js";

/**
 * Self-rendering text label with an optional sprite background. Both
 * the text and the bg are styled through {@link OscLabelStyle}; bg is
 * sized to the rendered text bounds × `bg.scaleX/scaleY` (use values
 * >= 1 for padded badges).
 *
 * `anchorX` / `anchorY` (each `0..1`) set the pivot of both the text
 * and the bg so they stay aligned — `(0, 0)` keeps the top-left at
 * the widget origin, `(0.5, 0.5)` centers, `(1, 1)` puts the
 * bottom-right at the origin.
 *
 * Style is captured at construction; runtime restyling isn't part of
 * the contract yet. Use {@link setText} to change the displayed
 * content — bg auto-resizes to match the new text bounds.
 */
export class OscLabel extends StyledHudObject<OscLabelStyle> {
  private readonly _text: PIXI.Text;
  private readonly _bg: PIXI.Sprite | PIXI.NineSliceSprite | null;

  private _enabled = true;

  public get text(): string {
    return this._text.text;
  }

  public get enabled(): boolean {
    return this._enabled;
  }

  public constructor(assetManager: AssetManager, style: OscLabelStyle, content: string, anchorX = 0, anchorY = 0) {
    super(assetManager, style);

    const textVisual = this._resolveTextStyle(
      this._style.text,
      "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      16,
      "normal",
      0xffffff,
      1,
    );
    this._text = this._buildText(content, textVisual);
    this._text.anchor.set(anchorX, anchorY);

    const bg = this._style.bg;
    if (bg?.textureId) {
      const bgVisual = this._resolveSpriteStyle(bg, bg.textureId, 0xffffff, 1, 1, 1);
      this._bg = this._buildSprite(bgVisual, this._text.width, this._text.height);
      this._bg.anchor.set(anchorX, anchorY);
      this.addChild(this._bg);
    } else {
      this._bg = null;
    }

    this.addChild(this._text);
  }

  /** Replaces the displayed text and re-sizes the bg to match the new bounds. */
  public setText(value: string): void {
    if (this._text.text === value) return;
    this._text.text = value;
    this._resizeBgToText();
  }

  /** Dims the label to half alpha when disabled; full alpha when enabled. */
  public setEnabled(enabled: boolean): void {
    if (this._enabled === enabled) return;
    this._enabled = enabled;
    this.alpha = enabled ? 1 : 0.5;
  }

  private _resizeBgToText(): void {
    if (!this._bg) return;
    const bg = this._style.bg;
    if (!bg?.textureId) return;
    const bgVisual = this._resolveSpriteStyle(bg, bg.textureId, 0xffffff, 1, 1, 1);
    this._applySpriteStyle(this._bg, bgVisual, this._text.width, this._text.height);
  }
}
