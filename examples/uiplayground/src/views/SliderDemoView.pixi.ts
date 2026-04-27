import {
  HudViewBase,
  SliderComponent,
  VerticalLayoutComponent,
  type Unsubscribe,
} from "@gamebyte/gamelabsjs";
import type { ISliderDemoView } from "./ISliderDemoView.js";

/**
 * Live preview for the `SliderComponent` playground demo.
 *
 * Most prop changes rebuild the underlying slider instance because
 * `SliderComponent`'s constructor-only options (track width, min/max,
 * step, colors) cannot be mutated after construction.
 */
export class SliderDemoView extends HudViewBase implements ISliderDemoView {
  private _wrapper: VerticalLayoutComponent | null = null;
  private _slider: SliderComponent | null = null;
  private _changeUnsub: Unsubscribe | null = null;
  private readonly _changeListeners = new Set<(value: number) => void>();

  // Mutable props.
  private _trackWidth = 240;
  private _min = 0;
  private _max = 1;
  private _stepped = false;
  private _fillColor = 0x4299e1;
  private _value = 0.5;

  public override postInitialize(): void {
    super.postInitialize();
    this._wrapper = new VerticalLayoutComponent({
      width: "100%",
      height: "100%",
      justifyContent: "center",
      alignItems: "center",
    });
    this.addChild(this._wrapper);
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
    // Snap the current value to the new range's lower bound so the
    // visible thumb starts in a sensible place after a range change.
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

  public onChange(cb: (value: number) => void): Unsubscribe {
    this._changeListeners.add(cb);
    return () => this._changeListeners.delete(cb);
  }

  public override preDestroy(): void {
    this._changeListeners.clear();
    this._changeUnsub?.();
    this._changeUnsub = null;
    this._slider?.removeFromParent();
    this._slider?.destroy();
    this._slider = null;
    this._wrapper?.removeFromParent();
    this._wrapper?.destroy({ children: true });
    this._wrapper = null;
    super.preDestroy();
  }

  private _fireChange(value: number): void {
    this._value = value;
    for (const cb of this._changeListeners) cb(value);
  }

  private _rebuildSlider(): void {
    if (!this._wrapper) return;
    this._changeUnsub?.();
    this._changeUnsub = null;
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
    this._wrapper.addChild(this._slider);
  }
}
