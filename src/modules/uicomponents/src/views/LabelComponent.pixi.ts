import "@pixi/layout";
import type { LayoutOptions } from "@pixi/layout";
import type * as PIXI from "pixi.js";
import type { AssetManager } from "../../../../core/assets/AssetManager.js";
import type { SpriteStyle } from "../../../../core/styles/SpriteStyle.js";
import { StyledHudObject } from "../../../../core/styles/StyledHudObject.js";
import type { LabelComponentStyle } from "../UIComponentsStyleTypes.js";

/**
 * Geometry / content options for a {@link LabelComponent}. Visual styling
 * (font / colour / optional bg texture) lives on the
 * {@link LabelComponentStyle} passed alongside the asset manager and is
 * owned by the framework's `StyleManager`.
 */
export type LabelComponentOpts = {
  /** X position. */
  x?: number;
  /** Y position. */
  y?: number;
  /** Initial text content. */
  text: string;
  /**
   * Anchor X (0..1) for both the text and the bg. Drives where the
   * label's `(x, y)` lands relative to the rendered content — `0` puts
   * the top-left of text + bg at `(x, y)`, `0.5` centres them, `1`
   * puts the bottom-right at `(x, y)`. @default 0
   */
  anchorX?: number;
  /** Anchor Y (0..1). @default 0 */
  anchorY?: number;
};

/**
 * Reusable label component, themed via the framework's `StyleManager`.
 *
 * Construction takes an `AssetManager`, a {@link LabelComponentStyle},
 * and geometry / content opts:
 *
 * ```ts
 * // Bare text (default skin — `bg` slot is unset on the framework default).
 * const labelStyle = this.styleManager.resolve<LabelComponentStyle>(UIComponentsStyleIds.Label);
 * const status = new LabelComponent(this.assetLoader, labelStyle, { text: "Ready" });
 *
 * // Badge — opt into a 9-slice bg per-call and pad it via scaleX/Y.
 * const badgeStyle = this.styleManager.resolve<LabelComponentStyle>(UIComponentsStyleIds.Label, {
 *   text: { color: 0x000000, fontWeight: "700" },
 *   bg: { textureId: MyAssetIds.BadgeBg, color: 0xffd700, alpha: 0.9, border: 6, scaleX: 1.4, scaleY: 1.6 },
 * });
 * const score = new LabelComponent(this.assetLoader, badgeStyle, { text: "0", anchorX: 0.5, anchorY: 0.5 });
 * ```
 *
 * Renders a `PIXI.Text` driven by the resolved `text` slot. When the
 * resolved `bg` slot supplies a `textureId` the component also builds
 * a backing sprite — a `PIXI.NineSliceSprite` when `bg.border > 0` so
 * rounded badges stay crisp across text widths, otherwise a plain
 * stretched `PIXI.Sprite`. The bg sizes itself to the rendered text
 * bounds × any per-axis scale on the slot, so `scaleX/Y > 1` produces
 * a padded badge.
 *
 * Both the text and the bg share `anchorX` / `anchorY` so they stay
 * aligned regardless of pivot. The component sets its own `.layout` to
 * the rendered content's bounding box so it participates in
 * `@pixi/layout` flex flows.
 *
 * Style is captured at construction; runtime restyling is intentionally
 * not part of the contract. Use {@link setText} to change the displayed
 * content — the bg auto-resizes to match the new bounds when present.
 */
export class LabelComponent extends StyledHudObject<LabelComponentStyle> {
  private readonly _text: PIXI.Text;
  private readonly _bg: PIXI.Sprite | PIXI.NineSliceSprite | null;
  private readonly _bgStyle: SpriteStyle | undefined;
  private readonly _anchorX: number;
  private readonly _anchorY: number;

  /** Current text content. */
  public get text(): string {
    return this._text.text;
  }

  public constructor(assetManager: AssetManager, style: LabelComponentStyle, opts: LabelComponentOpts) {
    super(assetManager, style);

    this._anchorX = opts.anchorX ?? 0;
    this._anchorY = opts.anchorY ?? 0;

    if (opts.x !== undefined) this.x = opts.x;
    if (opts.y !== undefined) this.y = opts.y;

    this._text = this._buildStyledText(opts.text, this._style.text);
    this._text.anchor.set(this._anchorX, this._anchorY);

    // Bg is opt-in: only built when the resolved slot supplies a
    // `textureId`. The bg sizes itself to the rendered text bounds so
    // tracking the text changes is just a partial-apply on `setText`.
    // Per-axis scale on the slot (`scaleX/Y > 1`) inflates the bg into
    // a padded badge — handled inside `_applyPartialSpriteStyle`.
    const bg = this._style.bg;
    this._bgStyle = bg;
    if (bg?.textureId !== undefined) {
      this._bg = this._buildStyledSprite(bg, this._text.width, this._text.height);
      this._bg.anchor.set(this._anchorX, this._anchorY);
      this.addChild(this._bg);
    } else {
      this._bg = null;
    }

    this.addChild(this._text);

    // Self-set layout so the label participates in flex flows. Size to
    // the bg when present (already scaled) or to the bare text bounds
    // otherwise.
    const layoutWidth = this._bg?.width ?? this._text.width;
    const layoutHeight = this._bg?.height ?? this._text.height;
    const layout: Omit<LayoutOptions, "target"> = { width: layoutWidth, height: layoutHeight };
    this.layout = layout;
  }

  /**
   * Replaces the displayed text. The bg (when present) re-sizes to the
   * new rendered text bounds, and the layout box is updated so flex
   * parents re-flow on the next layout pass.
   */
  public setText(value: string): void {
    if (this._text.text === value) return;
    this._text.text = value;
    if (this._bg) {
      this._applyPartialSpriteStyle(this._bg, this._bgStyle, this._text.width, this._text.height);
    }
    const layoutWidth = this._bg?.width ?? this._text.width;
    const layoutHeight = this._bg?.height ?? this._text.height;
    this.layout = { width: layoutWidth, height: layoutHeight };
  }
}
