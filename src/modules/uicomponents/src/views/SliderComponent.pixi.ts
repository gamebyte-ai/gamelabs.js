import * as PIXI from "pixi.js";
import type { Unsubscribe } from "../../../../core/events/subscriptions.js";

export type SliderComponentPreset = {
  /** Track width. @default 140 */
  trackWidth?: number;
  /** Track height. @default 6 */
  trackHeight?: number;
  /** Thumb radius. @default 10 */
  thumbRadius?: number;
  /** Track background color. @default 0xcbd5e0 */
  trackColor?: number;
  /** Filled portion color. @default 0x4299e1 */
  fillColor?: number;
  /** Thumb outer ring color. @default 0x4299e1 */
  thumbColor?: number;
  /** Thumb inner circle color. @default 0xffffff */
  thumbInnerColor?: number;
  /** Thumb inner inset. @default 3 */
  thumbInset?: number;
  /** Minimum value. @default 0 */
  min?: number;
  /** Maximum value. @default 1 */
  max?: number;
  /** Step size. 0 for continuous. @default 0 */
  step?: number;
  /** Initial value. @default 0 */
  value?: number;
};

/**
 * Parse a JSON string into SliderComponentPreset.
 */
export function parseSliderComponentPreset(json: string): SliderComponentPreset {
  return JSON.parse(json) as SliderComponentPreset;
}

/**
 * Reusable slider component.
 *
 * - Renders a horizontal track with filled portion and a draggable thumb.
 * - Supports min/max/step value constraints.
 * - Tap on track or drag thumb to change value.
 * - `onChange(cb)` returns an `Unsubscribe` for easy cleanup.
 */
export class SliderComponent extends PIXI.Container {
  private readonly _track: PIXI.Graphics;
  private readonly _thumb: PIXI.Graphics;
  private readonly _trackWidth: number;
  private readonly _trackHeight: number;
  private readonly _thumbRadius: number;
  private readonly _trackColor: number;
  private readonly _fillColor: number;
  private readonly _thumbColor: number;
  private readonly _thumbInnerColor: number;
  private readonly _thumbInset: number;
  private readonly _min: number;
  private readonly _max: number;
  private readonly _step: number;
  private readonly _changeListeners = new Set<(value: number) => void>();

  private _value: number;
  private _dragging = false;

  public constructor(opts: SliderComponentPreset = {}) {
    super();

    this._trackWidth = opts.trackWidth ?? 140;
    this._trackHeight = opts.trackHeight ?? 6;
    this._thumbRadius = opts.thumbRadius ?? 10;
    this._trackColor = opts.trackColor ?? 0xcbd5e0;
    this._fillColor = opts.fillColor ?? 0x4299e1;
    this._thumbColor = opts.thumbColor ?? 0x4299e1;
    this._thumbInnerColor = opts.thumbInnerColor ?? 0xffffff;
    this._thumbInset = opts.thumbInset ?? 3;
    this._min = opts.min ?? 0;
    this._max = opts.max ?? 1;
    this._step = opts.step ?? 0;
    this._value = opts.value ?? this._min;

    this.eventMode = "static";

    this._track = new PIXI.Graphics();
    this._track.eventMode = "static";
    this.addChild(this._track);

    this._thumb = new PIXI.Graphics();
    this._thumb.eventMode = "static";
    this._thumb.cursor = "pointer";
    this.addChild(this._thumb);

    this._track.on("pointerdown", (e: PIXI.FederatedPointerEvent) => this.onTrackPointerDown(e));
    this._thumb.on("pointerdown", () => this.onThumbPointerDown());
    this.on("globalpointermove", (e: PIXI.FederatedPointerEvent) => this.onGlobalPointerMove(e));
    this.on("pointerup", () => this.onPointerUp());
    this.on("pointerupoutside", () => this.onPointerUp());

    this.redraw();
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
    this.redraw();
  }

  /** Subscribe to value changes. Returns an unsubscribe function. */
  public onChange(cb: (value: number) => void): Unsubscribe {
    this._changeListeners.add(cb);
    return () => this._changeListeners.delete(cb);
  }

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
    const localX = globalX - this._track.getGlobalPosition().x;
    const ratio = Math.max(0, Math.min(1, localX / this._trackWidth));
    const raw = this._min + ratio * (this._max - this._min);
    const stepped = this._step > 0 ? Math.round(raw / this._step) * this._step : raw;
    const clamped = Math.max(this._min, Math.min(this._max, stepped));

    if (clamped === this._value) return;
    this._value = clamped;
    this.redraw();
    for (const cb of this._changeListeners) cb(this._value);
  }

  private redraw(): void {
    const tw = this._trackWidth;
    const th = this._trackHeight;
    const tr = this._thumbRadius;

    // Track background
    this._track.clear();
    this._track.roundRect(0, -th / 2, tw, th, th / 2);
    this._track.fill({ color: this._trackColor });

    // Filled portion
    const ratio = this._max > this._min ? (this._value - this._min) / (this._max - this._min) : 0;
    const filledW = ratio * tw;
    this._track.roundRect(0, -th / 2, filledW, th, th / 2);
    this._track.fill({ color: this._fillColor });

    // Thumb
    const thumbX = filledW;
    this._thumb.clear();
    this._thumb.circle(0, 0, tr);
    this._thumb.fill({ color: this._thumbColor });
    this._thumb.circle(0, 0, tr - this._thumbInset);
    this._thumb.fill({ color: this._thumbInnerColor });
    this._thumb.position.set(this._track.x + thumbX, this._track.y);
  }
}
