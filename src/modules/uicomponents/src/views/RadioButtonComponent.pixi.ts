import type { LayoutOptions } from "@pixi/layout";
import * as PIXI from "pixi.js";
import type { Unsubscribe } from "../../../../core/events/subscriptions.js";

export type RadioButtonComponentPreset = {
  /** X position. */
  x?: number;
  /** Y position. */
  y?: number;
  /** Fixed width. When omitted, sized to fit indicator + gap + label. */
  width?: number;
  /** Fixed height. When omitted, matches the indicator diameter. */
  height?: number;
  /** Optional label drawn to the right of the indicator. Omit for an icon-only button. */
  label?: string;
  /** Label style overrides merged on top of the defaults. */
  labelStyle?: Partial<PIXI.TextStyleOptions>;
  /** Outer ring radius. @default 9 */
  radius?: number;
  /** Inner dot radius drawn when selected. @default 4 */
  innerRadius?: number;
  /** Outer ring border width. @default 2 */
  borderWidth?: number;
  /** Outer ring border color. @default 0x475569 */
  borderColor?: number;
  /** Indicator background fill (interior of the outer ring). @default 0x111827 */
  fillColor?: number;
  /** Inner dot color used when selected. @default 0x4338ca */
  selectedColor?: number;
  /** Gap between the indicator and the label, in pixels. @default 8 */
  gap?: number;
  /** Initial selected state. @default false */
  selected?: boolean;
};

/**
 * Parse a JSON string into RadioButtonComponentPreset.
 */
export function parseRadioButtonComponentPreset(json: string): RadioButtonComponentPreset {
  return JSON.parse(json) as RadioButtonComponentPreset;
}

const DEFAULT_LABEL_STYLE: Partial<PIXI.TextStyleOptions> = {
  fill: 0xe8eef6,
  fontSize: 14,
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
  fontWeight: "600",
};

/**
 * Reusable radio-button indicator with optional label.
 *
 * - Renders an outer ring plus an inner dot when selected. The whole
 *   bounding box (indicator + gap + label) is the click target.
 * - State is decoupled from the click: tapping the button fires
 *   `onPress` but does NOT auto-set `selected`. Callers (typically a
 *   `RadioButtonGroupComponent`) decide what selection change happens
 *   and call `setSelected()` accordingly. Standalone consumers can
 *   wire `btn.onPress(() => btn.setSelected(true))` themselves.
 * - `setSelected()` is silent — it only updates the visual.
 *
 * The component sets its own `.layout` so it participates in
 * `@pixi/layout` flex flows alongside other layout-aware children.
 * Pass `width` / `height` in the preset to override the intrinsic
 * size derived from the indicator + label.
 */
export class RadioButtonComponent extends PIXI.Container {
  private readonly _indicator: PIXI.Graphics;
  private readonly _label: PIXI.Text | null;
  private readonly _radius: number;
  private readonly _innerRadius: number;
  private readonly _borderWidth: number;
  private readonly _borderColor: number;
  private readonly _fillColor: number;
  private readonly _selectedColor: number;
  private readonly _pressListeners = new Set<() => void>();

  private _selected: boolean;

  public constructor(opts: RadioButtonComponentPreset = {}) {
    super();

    this._radius = opts.radius ?? 9;
    this._innerRadius = opts.innerRadius ?? 4;
    this._borderWidth = opts.borderWidth ?? 2;
    this._borderColor = opts.borderColor ?? 0x475569;
    this._fillColor = opts.fillColor ?? 0x111827;
    this._selectedColor = opts.selectedColor ?? 0x4338ca;
    this._selected = opts.selected ?? false;
    const gap = opts.gap ?? 8;

    if (opts.x !== undefined) this.x = opts.x;
    if (opts.y !== undefined) this.y = opts.y;

    this._indicator = new PIXI.Graphics();
    this._indicator.eventMode = "none";
    this.addChild(this._indicator);

    if (opts.label !== undefined) {
      const mergedStyle = { ...DEFAULT_LABEL_STYLE, ...opts.labelStyle };
      this._label = new PIXI.Text({ text: opts.label, style: mergedStyle });
      this._label.anchor.set(0, 0.5);
      this._label.eventMode = "none";
      this.addChild(this._label);
    } else {
      this._label = null;
    }

    const indicatorSize = 2 * this._radius;
    const labelWidth = this._label?.width ?? 0;
    const totalWidth = opts.width ?? indicatorSize + (this._label ? gap + labelWidth : 0);
    const totalHeight = opts.height ?? indicatorSize;

    const layout: Omit<LayoutOptions, "target"> = { width: totalWidth, height: totalHeight };
    this.layout = layout;

    // Indicator is drawn as concentric circles centered on its
    // origin, so position the indicator's origin at the centerline.
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

    this._redraw();
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
    this._redraw();
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

  private _redraw(): void {
    this._indicator.clear();
    this._indicator
      .circle(0, 0, this._radius)
      .fill({ color: this._fillColor })
      .stroke({ color: this._borderColor, width: this._borderWidth });
    if (this._selected) {
      this._indicator.circle(0, 0, this._innerRadius).fill({ color: this._selectedColor });
    }
  }
}
