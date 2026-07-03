import type { LayoutOptions } from "@pixi/layout";
import type { DestroyOptions, NineSliceSprite, Sprite, Text } from "pixi.js";
import { Rectangle } from "pixi.js";
import type { AssetManager } from "../../../../core/assets/AssetManager.js";
import type { SpriteStyle } from "../../../../core/styles/SpriteStyle.js";
import { StyledHudObject } from "../../../../core/styles/StyledHudObject.js";
import type { Unsubscribe } from "../../../../core/events/subscriptions.js";
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

type RadioState = "unselected" | "selected";

/**
 * Reusable radio-button indicator with optional label, themed via the
 * framework's style system.
 *
 * Construction takes an `AssetManager`, a
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
  private readonly _indicator: Sprite | NineSliceSprite;
  private readonly _label: Text | null;
  private readonly _radius: number;
  private readonly _stateStyles: Record<RadioState, SpriteStyle | undefined>;
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
      unselected: style.unselected,
      selected: style.selected,
    };

    const indicatorSize = 2 * this._radius;
    // Build the indicator from the initial slot. Subsequent state
    // changes partial-apply on the same sprite (texture + tint + alpha
    // swap for fields the slot defines) — no rebuild.
    const initialState: RadioState = this._selected ? "selected" : "unselected";
    this._indicator = this._buildStyledSprite(this._stateStyles[initialState], indicatorSize, indicatorSize);
    this._indicator.eventMode = "none";
    this.addChild(this._indicator);

    if (opts.label !== undefined) {
      this._label = this._buildStyledText(opts.label, style.label);
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

    // `_buildStyledSprite` centers the sprite at (0, 0); position its origin
    // at the indicator's centerline so concentric rendering lines up.
    this._indicator.position.set(this._radius, totalHeight / 2);
    if (this._label) {
      this._label.position.set(indicatorSize + gap, totalHeight / 2);
    }

    this.eventMode = "static";
    this.cursor = "pointer";
    // Explicit hit area so taps anywhere in the bounding box (including
    // the gap between indicator and label) register as a press.
    this.hitArea = new Rectangle(0, 0, totalWidth, totalHeight);
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
    this._applyPartialSpriteStyle(this._indicator, this._stateStyles[state], indicatorSize, indicatorSize);
  }

  /** Subscribe to user taps on the radio button. Returns an unsubscribe function. */
  public onPress(cb: () => void): Unsubscribe {
    this._pressListeners.add(cb);
    return () => this._pressListeners.delete(cb);
  }

  public override destroy(opts?: DestroyOptions): void {
    this._pressListeners.clear();
    super.destroy(opts);
  }

  private _firePress(): void {
    for (const cb of this._pressListeners) cb();
  }
}
