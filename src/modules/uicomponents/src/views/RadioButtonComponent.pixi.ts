import type { LayoutOptions } from "@pixi/layout";
import * as PIXI from "pixi.js";
import type { AssetManager } from "../../../../core/assets/AssetManager.js";
import type { SpriteStyle } from "../../../../core/styles/SpriteStyle.js";
import { StyledHudObject } from "../../../../core/styles/StyledHudObject.js";
import type { Unsubscribe } from "../../../../core/events/subscriptions.js";
import { UIComponentsAssetIds } from "../UIComponentsAssetIds.js";
import type { RadioButtonComponentStyle } from "../UIComponentsStyleTypes.js";

/**
 * Geometry / content options for a {@link RadioButtonComponent}. Visual
 * styling lives on the {@link RadioButtonComponentStyle} passed alongside
 * the asset manager and is owned by the framework's `StyleManager`.
 */
export type RadioButtonComponentOpts = {
  /** X position. */
  x?: number;
  /** Y position. */
  y?: number;
  /** Fixed width. When omitted, sized to fit indicator + gap + label. */
  width?: number;
  /** Fixed height. When omitted, matches the indicator diameter. */
  height?: number;
  /** Optional label drawn to the right of the indicator. */
  label?: string;
  /** Outer ring radius — drives the indicator sprite size (`2 * radius` square). @default 9 */
  radius?: number;
  /** Gap between indicator and label, in pixels. @default 8 */
  gap?: number;
  /** Initial selected state. @default false */
  selected?: boolean;
};

const DEFAULT_RADIUS = 9;
const DEFAULT_GAP = 8;

const DEFAULT_LABEL_FONT_FAMILY = "system-ui, -apple-system, Segoe UI, Roboto, Arial";
const DEFAULT_LABEL_FONT_SIZE = 14;
const DEFAULT_LABEL_FONT_WEIGHT = "600";
const DEFAULT_LABEL_COLOR = 0xe8eef6;
const DEFAULT_LABEL_ALPHA = 1;

const DEFAULT_INDICATOR_COLOR = 0xffffff;
const DEFAULT_INDICATOR_ALPHA = 1;
const DEFAULT_INDICATOR_SCALE = 1;
const DEFAULT_INDICATOR_BORDER = 0;

type RadioState = "unselected" | "selected";

const DEFAULT_TEXTURE_BY_STATE: Record<RadioState, string> = {
  unselected: UIComponentsAssetIds.DefaultRadioUnselected,
  selected: UIComponentsAssetIds.DefaultRadioSelected,
};

/**
 * Reusable radio-button indicator with optional label, themed via the
 * framework's style system.
 *
 * Construction takes an `AssetManager`, a fully-resolved
 * {@link RadioButtonComponentStyle}, and geometry / content opts. The
 * indicator is a single textured sprite whose texture swaps between the
 * resolved `unselected` / `selected` slots when the state changes.
 *
 * State is decoupled from the click — tapping the button fires
 * `onPress` but does **not** auto-set `selected`. Callers (typically a
 * {@link RadioButtonGroupComponent}) decide what selection change
 * happens and call `setSelected()` accordingly. Standalone consumers
 * can wire `btn.onPress(() => btn.setSelected(true))` themselves.
 *
 * The component sets its own `.layout` so it participates in
 * `@pixi/layout` flex flows. Pass `width` / `height` in the opts to
 * override the intrinsic size derived from indicator + label.
 */
export class RadioButtonComponent extends StyledHudObject<RadioButtonComponentStyle> {
  private readonly _indicator: PIXI.Sprite | PIXI.NineSliceSprite;
  private readonly _label: PIXI.Text | null;
  private readonly _radius: number;
  private readonly _stateStyles: Record<RadioState, Required<SpriteStyle>>;
  private readonly _pressListeners = new Set<() => void>();

  private _selected: boolean;

  public constructor(assetManager: AssetManager, style: RadioButtonComponentStyle, opts: RadioButtonComponentOpts = {}) {
    super(assetManager, style);

    this._radius = opts.radius ?? DEFAULT_RADIUS;
    this._selected = opts.selected ?? false;
    const gap = opts.gap ?? DEFAULT_GAP;

    if (opts.x !== undefined) this.x = opts.x;
    if (opts.y !== undefined) this.y = opts.y;

    this._stateStyles = {
      unselected: this._resolveSpriteStyle(
        style.unselected,
        DEFAULT_TEXTURE_BY_STATE.unselected,
        DEFAULT_INDICATOR_COLOR,
        DEFAULT_INDICATOR_ALPHA,
        DEFAULT_INDICATOR_SCALE,
        DEFAULT_INDICATOR_SCALE,
        DEFAULT_INDICATOR_BORDER,
      ),
      selected: this._resolveSpriteStyle(
        style.selected,
        DEFAULT_TEXTURE_BY_STATE.selected,
        DEFAULT_INDICATOR_COLOR,
        DEFAULT_INDICATOR_ALPHA,
        DEFAULT_INDICATOR_SCALE,
        DEFAULT_INDICATOR_SCALE,
        DEFAULT_INDICATOR_BORDER,
      ),
    };

    const indicatorSize = 2 * this._radius;
    // Build the indicator from the initial state. Subsequent state
    // changes call `_applySpriteStyle` on the same sprite (texture +
    // tint + alpha swap) — no rebuild.
    const initialState: RadioState = this._selected ? "selected" : "unselected";
    this._indicator = this._buildSprite(this._stateStyles[initialState], indicatorSize, indicatorSize);
    this._indicator.eventMode = "none";
    this.addChild(this._indicator);

    if (opts.label !== undefined) {
      const labelStyle = this._resolveTextStyle(
        style.label,
        DEFAULT_LABEL_FONT_FAMILY,
        DEFAULT_LABEL_FONT_SIZE,
        DEFAULT_LABEL_FONT_WEIGHT,
        DEFAULT_LABEL_COLOR,
        DEFAULT_LABEL_ALPHA,
      );
      this._label = this._buildText(opts.label, labelStyle);
      this._label.anchor.set(0, 0.5);
      this._label.eventMode = "none";
      this.addChild(this._label);
    } else {
      this._label = null;
    }

    const labelWidth = this._label?.width ?? 0;
    const totalWidth = opts.width ?? indicatorSize + (this._label ? gap + labelWidth : 0);
    const totalHeight = opts.height ?? indicatorSize;

    const layout: Omit<LayoutOptions, "target"> = { width: totalWidth, height: totalHeight };
    this.layout = layout;

    // `_buildSprite` centers the sprite at (0, 0); position its origin
    // at the indicator's centerline so concentric rendering lines up.
    this._indicator.position.set(this._radius, totalHeight / 2);
    if (this._label) {
      this._label.position.set(indicatorSize + gap, totalHeight / 2);
    }

    this.eventMode = "static";
    this.cursor = "pointer";
    // Explicit hit area so taps anywhere in the bounding box (including
    // the gap between indicator and label) register as a press.
    this.hitArea = new PIXI.Rectangle(0, 0, totalWidth, totalHeight);
    this.on("pointertap", () => this._firePress());
  }

  /** Whether the radio is currently rendered as selected. */
  public get selected(): boolean {
    return this._selected;
  }

  /**
   * Update the visual selected state. Silent — does NOT fire
   * `onPress`. Use this from a group when the user picks a different
   * option (the previously selected button gets `setSelected(false)`).
   */
  public setSelected(value: boolean): void {
    if (this._selected === value) return;
    this._selected = value;
    const state: RadioState = value ? "selected" : "unselected";
    const indicatorSize = 2 * this._radius;
    this._applySpriteStyle(this._indicator, this._stateStyles[state], indicatorSize, indicatorSize);
  }

  /** Subscribe to user taps on the radio button. Returns an unsubscribe function. */
  public onPress(cb: () => void): Unsubscribe {
    this._pressListeners.add(cb);
    return () => this._pressListeners.delete(cb);
  }

  public override destroy(opts?: PIXI.DestroyOptions): void {
    this._pressListeners.clear();
    super.destroy(opts);
  }

  private _firePress(): void {
    for (const cb of this._pressListeners) cb();
  }
}
