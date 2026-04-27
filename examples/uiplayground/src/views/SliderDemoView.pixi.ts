import * as PIXI from "pixi.js";
import {
  HudViewBase,
  SliderComponent,
  type IInstanceResolver,
  type Unsubscribe,
} from "@gamebyte/gamelabsjs";
import { UIPlaygroundConfig } from "../UIPlaygroundConfig.js";
import type { ISliderDemoView } from "./ISliderDemoView.js";

/** Default thumb radius matches `SliderComponent`'s constructor default. */
const SLIDER_THUMB_RADIUS = 10;

/**
 * Live preview for the `SliderComponent` playground demo.
 *
 * Most prop changes rebuild the underlying slider instance because
 * `SliderComponent`'s constructor-only options (track width, min/max,
 * step, colors) cannot be mutated after construction.
 *
 * Centring: handled by the parent stage container.
 *
 * Outline: drawn at `[0, -thumbRadius] → [trackWidth, +thumbRadius]`,
 * matching the slider's actual visible bounds (the track sits centered
 * on y=0; the thumb extends ±thumbRadius vertically).
 */
export class SliderDemoView extends HudViewBase implements ISliderDemoView {
  private _config: UIPlaygroundConfig | null = null;
  private _slider: SliderComponent | null = null;
  private _outline: PIXI.Graphics | null = null;
  private _outlineVisible = false;
  private _changeUnsub: Unsubscribe | null = null;
  private readonly _changeListeners = new Set<(value: number) => void>();

  // Mutable props.
  private _trackWidth = 240;
  private _min = 0;
  private _max = 1;
  private _stepped = false;
  private _fillColor = 0x4299e1;
  private _value = 0.5;

  public override inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._config = resolver.getInstance(UIPlaygroundConfig);
  }

  public override postInitialize(): void {
    super.postInitialize();
    this.layout = {};
    this._rebuildSlider();
  }

  public setTrackWidth(trackWidth: number): void {
    if (this._trackWidth === trackWidth) return;
    this._trackWidth = trackWidth;
    this._rebuildSlider();
  }

  public setRange(min: number, max: number): void {
    if (this._min === min && this._max === max) return;
    this._min = min;
    this._max = max;
    this._value = min;
    this._rebuildSlider();
  }

  public setStepped(stepped: boolean): void {
    if (this._stepped === stepped) return;
    this._stepped = stepped;
    this._rebuildSlider();
  }

  public setFillColor(color: number): void {
    if (this._fillColor === color) return;
    this._fillColor = color;
    this._rebuildSlider();
  }

  public setValue(value: number): void {
    this._value = value;
    this._slider?.setValue(value);
  }

  public setOutlineVisible(visible: boolean): void {
    this._outlineVisible = visible;
    this._refreshOutline();
  }

  public onChange(cb: (value: number) => void): Unsubscribe {
    this._changeListeners.add(cb);
    return () => this._changeListeners.delete(cb);
  }

  public override preDestroy(): void {
    this._changeListeners.clear();
    this._changeUnsub?.();
    this._changeUnsub = null;
    this._outline?.removeFromParent();
    this._outline?.destroy();
    this._outline = null;
    this._slider?.removeFromParent();
    this._slider?.destroy();
    this._slider = null;
    this._config = null;
    super.preDestroy();
  }

  private _fireChange(value: number): void {
    this._value = value;
    for (const cb of this._changeListeners) cb(value);
  }

  private _rebuildSlider(): void {
    this._changeUnsub?.();
    this._changeUnsub = null;
    this._outline?.removeFromParent();
    this._outline?.destroy();
    this._outline = null;
    this._slider?.removeFromParent();
    this._slider?.destroy();

    const stepSize = this._stepped ? (this._max - this._min) / 10 : 0;
    this._slider = new SliderComponent({
      trackWidth: this._trackWidth,
      min: this._min,
      max: this._max,
      step: stepSize,
      value: this._value,
      fillColor: this._fillColor,
      thumbColor: this._fillColor,
    });
    this._changeUnsub = this._slider.onChange((value) => this._fireChange(value));
    this.addChild(this._slider);
    this._refreshOutline();
  }

  private _refreshOutline(): void {
    this._outline?.removeFromParent();
    this._outline?.destroy();
    this._outline = null;
    if (!this._outlineVisible || !this._slider || !this._config) return;

    const outline = new PIXI.Graphics();
    outline.eventMode = "none";
    outline
      .rect(0, -SLIDER_THUMB_RADIUS, this._trackWidth, SLIDER_THUMB_RADIUS * 2)
      .stroke({ color: this._config.outlineColor, width: this._config.outlineWidth });
    this._slider.addChild(outline);
    this._outline = outline;
  }
}
