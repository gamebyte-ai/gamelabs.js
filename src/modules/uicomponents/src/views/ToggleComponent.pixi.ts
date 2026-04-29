import type { LayoutOptions } from "@pixi/layout";
import * as PIXI from "pixi.js";
import type { AssetManager } from "../../../../core/assets/AssetManager.js";
import type { SpriteStyle } from "../../../../core/styles/SpriteStyle.js";
import { StyledHudObject } from "../../../../core/styles/StyledHudObject.js";
import type { Unsubscribe } from "../../../../core/events/subscriptions.js";
import { UIComponentsAssetIds } from "../UIComponentsAssetIds.js";
import type { ToggleComponentStyle } from "../UIComponentsStyleTypes.js";

/**
 * Geometry / value options for a {@link ToggleComponent}. Visual styling
 * lives on the {@link ToggleComponentStyle} passed alongside the asset
 * manager and is owned by the framework's `StyleManager`.
 */
export type ToggleComponentOpts = {
  /** Toggle width. @default 44 */
  width?: number;
  /** Toggle height. @default 24 */
  height?: number;
  /**
   * Inset from the track edge to the thumb. The thumb renders at
   * `(height - 2 * thumbInset)` square. @default 3
   */
  thumbInset?: number;
  /** Initial value. @default false */
  value?: boolean;
};

const DEFAULT_WIDTH = 44;
const DEFAULT_HEIGHT = 24;
const DEFAULT_THUMB_INSET = 3;

const DEFAULT_BG_COLOR = 0xffffff;
const DEFAULT_BG_ALPHA = 1;
const DEFAULT_BG_SCALE = 1;
const DEFAULT_BG_BORDER = 0;

type TrackState = "on" | "off";

const DEFAULT_TRACK_TEXTURE_BY_STATE: Record<TrackState, string> = {
  on: UIComponentsAssetIds.DefaultToggleTrackOn,
  off: UIComponentsAssetIds.DefaultToggleTrackOff,
};

/**
 * Reusable on/off toggle, themed via the framework's style system.
 *
 * Construction takes an `AssetManager`, a fully-resolved
 * {@link ToggleComponentStyle}, and geometry / value opts:
 *
 * ```ts
 * const toggleStyle = this.styleManager.resolve<ToggleComponentStyle>(
 *   UIComponentsStyleIds.Toggle,
 * );
 * const enabled = new ToggleComponent(this.assetLoader, toggleStyle, {
 *   value: true,
 * });
 * enabled.onChange((v) => console.log("enabled:", v));
 * ```
 *
 * Renders two layered sprites — a stretched track (whose texture swaps
 * between the resolved `trackOn` / `trackOff` slots when the value
 * changes) and a thumb that slides between the off and on positions.
 * Tap anywhere on the toggle to flip the value; subscribers via
 * `onChange(cb)` receive the new boolean. `setValue` is silent on
 * purpose — programmatic updates don't echo back through `onChange`.
 *
 * The bg sprite type (`PIXI.Sprite` vs `PIXI.NineSliceSprite`) is fixed
 * at construction by the resolved track-on style's `border`. The default
 * skin's pill track ships with a rounded outline so it sticks with
 * `border: 0` (plain stretch); custom skins with straight track edges
 * can opt into 9-slice via the style override.
 */
export class ToggleComponent extends StyledHudObject<ToggleComponentStyle> {
  private readonly _track: PIXI.Sprite | PIXI.NineSliceSprite;
  private readonly _thumb: PIXI.Sprite | PIXI.NineSliceSprite;

  private readonly _trackStyles: Record<TrackState, Required<SpriteStyle>>;
  private readonly _thumbStyle: Required<SpriteStyle>;

  private readonly _width: number;
  private readonly _height: number;
  private readonly _thumbInset: number;
  private readonly _changeListeners = new Set<(value: boolean) => void>();

  private _value: boolean;

  public constructor(assetManager: AssetManager, style: ToggleComponentStyle, opts: ToggleComponentOpts = {}) {
    super(assetManager, style);

    this._width = opts.width ?? DEFAULT_WIDTH;
    this._height = opts.height ?? DEFAULT_HEIGHT;
    this._thumbInset = opts.thumbInset ?? DEFAULT_THUMB_INSET;
    this._value = opts.value ?? false;

    this._trackStyles = {
      on: this._resolveSpriteStyle(
        style.trackOn,
        DEFAULT_TRACK_TEXTURE_BY_STATE.on,
        DEFAULT_BG_COLOR,
        DEFAULT_BG_ALPHA,
        DEFAULT_BG_SCALE,
        DEFAULT_BG_SCALE,
        DEFAULT_BG_BORDER,
      ),
      off: this._resolveSpriteStyle(
        style.trackOff,
        DEFAULT_TRACK_TEXTURE_BY_STATE.off,
        DEFAULT_BG_COLOR,
        DEFAULT_BG_ALPHA,
        DEFAULT_BG_SCALE,
        DEFAULT_BG_SCALE,
        DEFAULT_BG_BORDER,
      ),
    };
    this._thumbStyle = this._resolveSpriteStyle(
      style.thumb,
      UIComponentsAssetIds.DefaultToggleThumb,
      DEFAULT_BG_COLOR,
      DEFAULT_BG_ALPHA,
      DEFAULT_BG_SCALE,
      DEFAULT_BG_SCALE,
      DEFAULT_BG_BORDER,
    );

    // Track — single sprite whose texture swaps on value change. Build
    // from the initial state's resolved style; that style's border
    // decides whether we end up with Sprite or NineSliceSprite.
    const initialTrackState: TrackState = this._value ? "on" : "off";
    this._track = this._buildSprite(this._trackStyles[initialTrackState], this._width, this._height);
    this._track.anchor.set(0, 0);
    this._track.position.set(0, 0);
    this.addChild(this._track);

    // Thumb — sized to fit between the track edges. The slide position
    // is recomputed from `_value` on every visual refresh.
    const thumbSize = this._height - this._thumbInset * 2;
    this._thumb = this._buildSprite(this._thumbStyle, thumbSize, thumbSize);
    this._thumb.anchor.set(0.5, 0.5);
    this.addChild(this._thumb);

    // Self-set layout so the toggle participates in `@pixi/layout` flex
    // flows (parent VerticalLayoutComponent / HorizontalLayoutComponent
    // would otherwise hand it a zero-sized box and the toggle would
    // render at (0, 0) on top of its siblings — same trap as
    // RadioButtonComponent).
    const layout: Omit<LayoutOptions, "target"> = { width: this._width, height: this._height };
    this.layout = layout;

    this.eventMode = "static";
    this.cursor = "pointer";
    this.hitArea = new PIXI.Rectangle(0, 0, this._width, this._height);
    this.on("pointertap", () => this.toggle());

    this._refreshThumb();
  }

  public get value(): boolean {
    return this._value;
  }

  public setValue(value: boolean): void {
    if (this._value === value) return;
    this._value = value;
    this._refreshTrack();
    this._refreshThumb();
  }

  public toggle(): void {
    this._value = !this._value;
    this._refreshTrack();
    this._refreshThumb();
    for (const cb of this._changeListeners) cb(this._value);
  }

  /** Subscribe to value changes. Returns an unsubscribe function. */
  public onChange(cb: (value: boolean) => void): Unsubscribe {
    this._changeListeners.add(cb);
    return () => this._changeListeners.delete(cb);
  }

  // ── Internals ──────────────────────────────────────────────────────

  private _refreshTrack(): void {
    const state: TrackState = this._value ? "on" : "off";
    this._applySpriteStyle(this._track, this._trackStyles[state], this._width, this._height);
  }

  private _refreshThumb(): void {
    const thumbSize = this._height - this._thumbInset * 2;
    // Off → centered at the left edge inset; On → centered at the right
    // edge inset. The thumb is anchored at its centre, so the position
    // values point at the thumb's centre coordinate.
    const thumbCx = this._value ? this._width - this._height / 2 : this._height / 2;
    this._applySpriteStyle(this._thumb, this._thumbStyle, thumbSize, thumbSize);
    this._thumb.position.set(thumbCx, this._height / 2);
  }
}
