import {
  HudViewBase,
  ToggleComponent,
  VerticalLayoutComponent,
  type Unsubscribe,
} from "@gamebyte/gamelabsjs";
import type { IToggleDemoView } from "./IToggleDemoView.js";

/**
 * Live preview for the `ToggleComponent` playground demo. Width /
 * height / on-color changes rebuild the underlying toggle (those are
 * constructor-only on `ToggleComponent`); `toggle()` reuses the live
 * instance so the user sees the actual flip animation.
 */
export class ToggleDemoView extends HudViewBase implements IToggleDemoView {
  private _wrapper: VerticalLayoutComponent | null = null;
  private _toggle: ToggleComponent | null = null;
  private _changeUnsub: Unsubscribe | null = null;
  private readonly _changeListeners = new Set<(value: boolean) => void>();

  private _width = 60;
  private _height = 32;
  private _onColor = 0x48bb78;
  private _value = false;

  public override postInitialize(): void {
    super.postInitialize();
    this._wrapper = new VerticalLayoutComponent({
      width: "100%",
      height: "100%",
      justifyContent: "center",
      alignItems: "center",
    });
    this.addChild(this._wrapper);
    this._rebuildToggle();
  }

  public setWidth(width: number): void {
    if (this._width === width) return;
    this._width = width;
    this._rebuildToggle();
  }

  public setHeight(height: number): void {
    if (this._height === height) return;
    this._height = height;
    this._rebuildToggle();
  }

  public setOnColor(color: number): void {
    if (this._onColor === color) return;
    this._onColor = color;
    this._rebuildToggle();
  }

  public toggle(): void {
    this._toggle?.toggle();
  }

  public onChange(cb: (value: boolean) => void): Unsubscribe {
    this._changeListeners.add(cb);
    return () => this._changeListeners.delete(cb);
  }

  public override preDestroy(): void {
    this._changeListeners.clear();
    this._changeUnsub?.();
    this._changeUnsub = null;
    this._toggle?.removeFromParent();
    this._toggle?.destroy();
    this._toggle = null;
    this._wrapper?.removeFromParent();
    this._wrapper?.destroy({ children: true });
    this._wrapper = null;
    super.preDestroy();
  }

  private _fireChange(value: boolean): void {
    this._value = value;
    for (const cb of this._changeListeners) cb(value);
  }

  private _rebuildToggle(): void {
    if (!this._wrapper) return;
    this._changeUnsub?.();
    this._changeUnsub = null;
    this._toggle?.removeFromParent();
    this._toggle?.destroy();

    this._toggle = new ToggleComponent({
      width: this._width,
      height: this._height,
      onColor: this._onColor,
      value: this._value,
    });
    this._changeUnsub = this._toggle.onChange((value) => this._fireChange(value));
    this._wrapper.addChild(this._toggle);
  }
}
