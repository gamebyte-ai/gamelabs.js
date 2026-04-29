import * as PIXI from "pixi.js";
import type { AssetManager } from "../../../../core/assets/AssetManager.js";
import type { SpriteStyle } from "../../../../core/styles/SpriteStyle.js";
import { StyledHudObject } from "../../../../core/styles/StyledHudObject.js";
import type { Unsubscribe } from "../../../../core/events/subscriptions.js";
import { UIComponentsAssetIds } from "../UIComponentsAssetIds.js";
import type { SliderComponentStyle } from "../UIComponentsStyleTypes.js";

/**
 * Geometry / value options for a {@link SliderComponent}. Visual styling
 * lives on the {@link SliderComponentStyle} passed alongside the asset
 * manager and is owned by the framework's `StyleManager`.
 */
export type SliderComponentOpts = {
  /** Track width. @default 140 */
  trackWidth?: number;
  /** Track height. @default 6 */
  trackHeight?: number;
  /** Thumb radius. @default 10 */
  thumbRadius?: number;
  /** Minimum value. @default 0 */
  min?: number;
  /** Maximum value. @default 1 */
  max?: number;
  /** Step size. 0 for continuous. @default 0 */
  step?: number;
  /** Initial value. @default min */
  value?: number;
};

const DEFAULT_BG_COLOR = 0xffffff;
const DEFAULT_BG_ALPHA = 1;
const DEFAULT_BG_SCALE = 1;
const DEFAULT_BG_BORDER = 0;

/**
 * Reusable slider component, themed via the framework's style system.
 *
 * Construction takes an `AssetManager`, a fully-resolved
 * {@link SliderComponentStyle}, and geometry options:
 *
 * ```ts
 * const style = this.styleManager.resolve<SliderComponentStyle>(
 *   UIComponentsStyleIds.Slider,
 *   // optional per-slider override
 * );
 * const slider = new SliderComponent(this.assetLoader, style, {
 *   trackWidth: 200, min: 0, max: 100, step: 1, value: 50,
 * });
 * ```
 *
 * Renders three textured sprites:
 * - **track** — full-length background, sized to `trackWidth × trackHeight`.
 * - **fill** — value-driven foreground (0..value), same height as track,
 *   width grows with the value ratio.
 * - **thumb** — draggable handle, sized to `thumbRadius * 2` square,
 *   anchored at its centre on the value position.
 *
 * Track + fill use `PIXI.NineSliceSprite` when their resolved
 * `SpriteStyle.border` is positive so the corners stay crisp at any
 * length; the thumb is always a plain stretched sprite. Per-axis
 * `Container.tint` on the slider propagates to all three sub-sprites
 * — this is the canonical pattern for colour identity (e.g. R/G/B
 * channel sliders sharing a single neutral skin).
 *
 * Tap the track or drag the thumb to change value; subscribers via
 * `onChange(cb)` receive the clamped (and step-snapped) value.
 * `setValue` is silent on purpose — programmatic updates don't echo
 * back through `onChange`.
 */
export class SliderComponent extends StyledHudObject<SliderComponentStyle> {
  private readonly _trackHost: PIXI.Container;
  private readonly _trackSprite: PIXI.Sprite | PIXI.NineSliceSprite;
  private readonly _fillSprite: PIXI.Sprite | PIXI.NineSliceSprite;
  private readonly _thumb: PIXI.Sprite | PIXI.NineSliceSprite;

  private readonly _trackStyle: Required<SpriteStyle>;
  private readonly _fillStyle: Required<SpriteStyle>;
  private readonly _thumbStyle: Required<SpriteStyle>;

  private readonly _trackWidth: number;
  private readonly _trackHeight: number;
  private readonly _thumbRadius: number;
  private readonly _min: number;
  private readonly _max: number;
  private readonly _step: number;
  private readonly _changeListeners = new Set<(value: number) => void>();

  private _value: number;
  private _dragging = false;

  public constructor(assetManager: AssetManager, style: SliderComponentStyle, opts: SliderComponentOpts = {}) {
    super(assetManager, style);

    this._trackWidth = opts.trackWidth ?? 140;
    this._trackHeight = opts.trackHeight ?? 6;
    this._thumbRadius = opts.thumbRadius ?? 10;
    this._min = opts.min ?? 0;
    this._max = opts.max ?? 1;
    this._step = opts.step ?? 0;
    this._value = opts.value ?? this._min;

    this._trackStyle = this._resolveSpriteStyle(
      style.track,
      UIComponentsAssetIds.DefaultSliderTrack,
      DEFAULT_BG_COLOR,
      DEFAULT_BG_ALPHA,
      DEFAULT_BG_SCALE,
      DEFAULT_BG_SCALE,
      DEFAULT_BG_BORDER,
    );
    this._fillStyle = this._resolveSpriteStyle(
      style.fill,
      UIComponentsAssetIds.DefaultSliderFill,
      DEFAULT_BG_COLOR,
      DEFAULT_BG_ALPHA,
      DEFAULT_BG_SCALE,
      DEFAULT_BG_SCALE,
      DEFAULT_BG_BORDER,
    );
    this._thumbStyle = this._resolveSpriteStyle(
      style.thumb,
      UIComponentsAssetIds.DefaultSliderThumb,
      DEFAULT_BG_COLOR,
      DEFAULT_BG_ALPHA,
      DEFAULT_BG_SCALE,
      DEFAULT_BG_SCALE,
      DEFAULT_BG_BORDER,
    );

    this.eventMode = "static";

    // Track host carries the hit area so taps anywhere along the track
    // register, even before the layout pass has computed real dims.
    this._trackHost = new PIXI.Container();
    this._trackHost.eventMode = "static";
    this._trackHost.position.set(0, 0);
    this.addChild(this._trackHost);

    this._trackSprite = this._buildSprite(this._trackStyle, this._trackWidth, this._trackHeight);
    this._trackSprite.anchor.set(0, 0);
    this._trackSprite.position.set(0, -this._trackHeight / 2);
    this._trackHost.addChild(this._trackSprite);

    this._fillSprite = this._buildSprite(this._fillStyle, 0, this._trackHeight);
    this._fillSprite.anchor.set(0, 0);
    this._fillSprite.position.set(0, -this._trackHeight / 2);
    this._trackHost.addChild(this._fillSprite);

    this._thumb = this._buildSprite(this._thumbStyle, this._thumbRadius * 2, this._thumbRadius * 2);
    this._thumb.anchor.set(0.5, 0.5);
    this._thumb.eventMode = "static";
    this._thumb.cursor = "pointer";
    this.addChild(this._thumb);

    this._trackHost.hitArea = new PIXI.Rectangle(0, -this._trackHeight / 2, this._trackWidth, this._trackHeight);

    this._trackHost.on("pointerdown", (e: PIXI.FederatedPointerEvent) => this.onTrackPointerDown(e));
    this._thumb.on("pointerdown", () => this.onThumbPointerDown());
    this.on("globalpointermove", (e: PIXI.FederatedPointerEvent) => this.onGlobalPointerMove(e));
    this.on("pointerup", () => this.onPointerUp());
    this.on("pointerupoutside", () => this.onPointerUp());

    this.refreshFillAndThumb();
  }

  public get value(): number {
    return this._value;
  }

  public get min(): number {
    return this._min;
  }

  public get max(): number {
    return this._max;
  }

  public get step(): number {
    return this._step;
  }

  public setValue(value: number): void {
    const clamped = Math.max(this._min, Math.min(this._max, value));
    if (clamped === this._value) return;
    this._value = clamped;
    this.refreshFillAndThumb();
  }

  /** Subscribe to value changes. Returns an unsubscribe function. */
  public onChange(cb: (value: number) => void): Unsubscribe {
    this._changeListeners.add(cb);
    return () => this._changeListeners.delete(cb);
  }

  // ── Internal: pointer handling ────────────────────────────────────

  private onTrackPointerDown(e: PIXI.FederatedPointerEvent): void {
    this._dragging = true;
    this.updateFromGlobalX(e.global.x);
  }

  private onThumbPointerDown(): void {
    this._dragging = true;
  }

  private onGlobalPointerMove(e: PIXI.FederatedPointerEvent): void {
    if (this._dragging) this.updateFromGlobalX(e.global.x);
  }

  private onPointerUp(): void {
    this._dragging = false;
  }

  private updateFromGlobalX(globalX: number): void {
    const localX = globalX - this._trackHost.getGlobalPosition().x;
    const ratio = Math.max(0, Math.min(1, localX / this._trackWidth));
    const raw = this._min + ratio * (this._max - this._min);
    const stepped = this._step > 0 ? Math.round(raw / this._step) * this._step : raw;
    const clamped = Math.max(this._min, Math.min(this._max, stepped));

    if (clamped === this._value) return;
    this._value = clamped;
    this.refreshFillAndThumb();
    for (const cb of this._changeListeners) cb(this._value);
  }

  private refreshFillAndThumb(): void {
    const ratio = this._max > this._min ? (this._value - this._min) / (this._max - this._min) : 0;
    const filledW = ratio * this._trackWidth;

    this._applySpriteStyle(this._fillSprite, this._fillStyle, Math.max(0, filledW), this._trackHeight);
    this._thumb.position.set(filledW, 0);
  }
}
