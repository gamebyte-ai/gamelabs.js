import {
  ButtonComponent,
  HudViewBase,
  VerticalLayoutComponent,
  type Unsubscribe,
} from "@gamebyte/gamelabsjs";
import type { IButtonDemoView } from "./IButtonDemoView.js";

/**
 * Live preview for the `ButtonComponent` playground demo. Lives inside
 * the shell view's stage region as a HUD child view. Created and
 * destroyed by `PlaygroundShellView.mountDemo` via the framework's
 * `viewFactory`.
 */
export class ButtonDemoView extends HudViewBase implements IButtonDemoView {
  private _wrapper: VerticalLayoutComponent | null = null;
  private _button: ButtonComponent | null = null;
  private _pressUnsub: Unsubscribe | null = null;
  private readonly _pressListeners = new Set<() => void>();

  // Mutable props driving the live `ButtonComponent` instance.
  private _label = "Click me";
  private _width = 160;
  private _height = 44;
  private _radius = 12;
  private _fillColor = 0x3b82f6;

  public override postInitialize(): void {
    super.postInitialize();
    this._wrapper = new VerticalLayoutComponent({
      width: "100%",
      height: "100%",
      justifyContent: "center",
      alignItems: "center",
    });
    this.addChild(this._wrapper);
    this._rebuildButton();
  }

  public setWidth(width: number): void {
    if (this._width === width) return;
    this._width = width;
    this._rebuildButton();
  }

  public setHeight(height: number): void {
    if (this._height === height) return;
    this._height = height;
    this._rebuildButton();
  }

  public setRadius(radius: number): void {
    if (this._radius === radius) return;
    this._radius = radius;
    this._rebuildButton();
  }

  public setFillColor(color: number): void {
    if (this._fillColor === color) return;
    this._fillColor = color;
    this._rebuildButton();
  }

  public setLabel(label: string): void {
    if (this._label === label) return;
    this._label = label;
    // Label is the only prop with a runtime setter on `ButtonComponent`.
    this._button?.setLabel(label);
  }

  public onPress(cb: () => void): Unsubscribe {
    this._pressListeners.add(cb);
    return () => this._pressListeners.delete(cb);
  }

  public override preDestroy(): void {
    this._pressListeners.clear();
    this._pressUnsub?.();
    this._pressUnsub = null;
    this._button?.removeFromParent();
    this._button?.destroy();
    this._button = null;
    this._wrapper?.removeFromParent();
    this._wrapper?.destroy({ children: true });
    this._wrapper = null;
    super.preDestroy();
  }

  private _firePress(): void {
    for (const cb of this._pressListeners) cb();
  }

  private _rebuildButton(): void {
    if (!this._wrapper) return;
    this._pressUnsub?.();
    this._pressUnsub = null;
    this._button?.removeFromParent();
    this._button?.destroy();

    this._button = new ButtonComponent({
      width: this._width,
      height: this._height,
      radius: this._radius,
      fillColor: this._fillColor,
      label: this._label,
      labelStyle: { fontSize: 16, fontWeight: "700", fill: 0xffffff },
    });
    this._pressUnsub = this._button.onPress(() => this._firePress());
    this._wrapper.addChild(this._button);
  }
}
