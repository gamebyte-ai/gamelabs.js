import * as PIXI from "pixi.js";
import type { Unsubscribe } from "../../../../core/events/subscriptions.js";

export type ToggleComponentPreset = {
  /** Toggle width. @default 44 */
  width?: number;
  /** Toggle height. @default 24 */
  height?: number;
  /** Background color when on. @default 0x48bb78 */
  onColor?: number;
  /** Background color when off. @default 0xcbd5e0 */
  offColor?: number;
  /** Thumb color. @default 0xffffff */
  thumbColor?: number;
  /** Thumb inset from edge. @default 3 */
  thumbInset?: number;
  /** Initial value. @default false */
  value?: boolean;
};

/**
 * Parse a JSON string into ToggleComponentPreset.
 */
export function parseToggleComponentPreset(json: string): ToggleComponentPreset {
  return JSON.parse(json) as ToggleComponentPreset;
}

/**
 * Reusable toggle (on/off switch) component.
 *
 * - Renders a pill-shaped track with a sliding circle thumb.
 * - Tap to toggle. Value changes are emitted via `onChange(cb)`.
 * - `onChange(cb)` returns an `Unsubscribe` for easy cleanup.
 */
export class ToggleComponent extends PIXI.Graphics {
  private readonly _width: number;
  private readonly _height: number;
  private readonly _onColor: number;
  private readonly _offColor: number;
  private readonly _thumbColor: number;
  private readonly _thumbInset: number;
  private readonly _changeListeners = new Set<(value: boolean) => void>();

  private _value: boolean;

  public constructor(opts: ToggleComponentPreset = {}) {
    super();

    this._width = opts.width ?? 44;
    this._height = opts.height ?? 24;
    this._onColor = opts.onColor ?? 0x48bb78;
    this._offColor = opts.offColor ?? 0xcbd5e0;
    this._thumbColor = opts.thumbColor ?? 0xffffff;
    this._thumbInset = opts.thumbInset ?? 3;
    this._value = opts.value ?? false;

    this.eventMode = "static";
    this.cursor = "pointer";
    this.on("pointertap", () => this.toggle());

    this.redraw();
  }

  public get value(): boolean {
    return this._value;
  }

  public setValue(value: boolean): void {
    if (this._value === value) return;
    this._value = value;
    this.redraw();
  }

  public toggle(): void {
    this._value = !this._value;
    this.redraw();
    for (const cb of this._changeListeners) cb(this._value);
  }

  /** Subscribe to value changes. Returns an unsubscribe function. */
  public onChange(cb: (value: boolean) => void): Unsubscribe {
    this._changeListeners.add(cb);
    return () => this._changeListeners.delete(cb);
  }

  private redraw(): void {
    const w = this._width;
    const h = this._height;
    const r = h / 2;

    this.clear();
    this.roundRect(0, 0, w, h, r);
    this.fill({ color: this._value ? this._onColor : this._offColor });

    const thumbX = this._value ? w - r : r;
    this.circle(thumbX, r, r - this._thumbInset);
    this.fill({ color: this._thumbColor });
  }
}
