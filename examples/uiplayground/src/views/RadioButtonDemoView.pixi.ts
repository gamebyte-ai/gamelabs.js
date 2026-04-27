import * as PIXI from "pixi.js";
import {
  HudViewBase,
  RadioButtonComponent,
  type IInstanceResolver,
  type Unsubscribe,
} from "@gamebyte/gamelabsjs";
import { UIPlaygroundConfig } from "../UIPlaygroundConfig.js";
import type { IRadioButtonDemoView } from "./IRadioButtonDemoView.js";

/**
 * Live preview for the `RadioButtonComponent` playground demo.
 *
 * Most prop changes rebuild the underlying button (the component's
 * appearance options are constructor-only); only `selected` flows
 * through to the live instance via `setSelected()`.
 *
 * On user tap, the component fires `onPress` but does NOT auto-select
 * (the component is decoupled by design — a group is supposed to own
 * mutual exclusion). The demo wires the standalone fallback here:
 * tap → flip selected → re-render → fire the demo's onPress for the
 * event log.
 *
 * Outline: drawn at the radio's `getLocalBounds()` — i.e. the indicator
 * + gap + label bounding box, which matches the component's hit area.
 */
export class RadioButtonDemoView extends HudViewBase implements IRadioButtonDemoView {
  private _config: UIPlaygroundConfig | null = null;
  private _radio: RadioButtonComponent | null = null;
  private _outline: PIXI.Graphics | null = null;
  private _outlineVisible = false;
  private _pressUnsub: Unsubscribe | null = null;
  private readonly _pressListeners = new Set<() => void>();

  // Mutable props.
  private _radius = 9;
  private _innerRadius = 4;
  private _borderWidth = 2;
  private _gap = 8;
  private _selectedColor = 0x4338ca;
  private _label = "Option A";
  private _selected = true;

  public override inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._config = resolver.getInstance(UIPlaygroundConfig);
  }

  public override postInitialize(): void {
    super.postInitialize();
    this.layout = {};
    this._rebuildRadio();
  }

  public setRadius(radius: number): void {
    if (this._radius === radius) return;
    this._radius = radius;
    this._rebuildRadio();
  }

  public setInnerRadius(innerRadius: number): void {
    if (this._innerRadius === innerRadius) return;
    this._innerRadius = innerRadius;
    this._rebuildRadio();
  }

  public setBorderWidth(width: number): void {
    if (this._borderWidth === width) return;
    this._borderWidth = width;
    this._rebuildRadio();
  }

  public setGap(gap: number): void {
    if (this._gap === gap) return;
    this._gap = gap;
    this._rebuildRadio();
  }

  public setSelectedColor(color: number): void {
    if (this._selectedColor === color) return;
    this._selectedColor = color;
    this._rebuildRadio();
  }

  public setLabel(label: string): void {
    if (this._label === label) return;
    this._label = label;
    this._rebuildRadio();
  }

  public toggleSelected(): void {
    this._selected = !this._selected;
    this._radio?.setSelected(this._selected);
  }

  public setOutlineVisible(visible: boolean): void {
    this._outlineVisible = visible;
    this._refreshOutline();
  }

  public onPress(cb: () => void): Unsubscribe {
    this._pressListeners.add(cb);
    return () => this._pressListeners.delete(cb);
  }

  public override preDestroy(): void {
    this._pressListeners.clear();
    this._pressUnsub?.();
    this._pressUnsub = null;
    this._outline?.removeFromParent();
    this._outline?.destroy();
    this._outline = null;
    this._radio?.removeFromParent();
    this._radio?.destroy();
    this._radio = null;
    this._config = null;
    super.preDestroy();
  }

  private _firePress(): void {
    for (const cb of this._pressListeners) cb();
  }

  private _rebuildRadio(): void {
    this._pressUnsub?.();
    this._pressUnsub = null;
    this._outline?.removeFromParent();
    this._outline?.destroy();
    this._outline = null;
    this._radio?.removeFromParent();
    this._radio?.destroy();

    this._radio = new RadioButtonComponent({
      label: this._label,
      radius: this._radius,
      innerRadius: this._innerRadius,
      borderWidth: this._borderWidth,
      gap: this._gap,
      selectedColor: this._selectedColor,
      selected: this._selected,
    });
    this._pressUnsub = this._radio.onPress(() => this._handleLivePress());
    this.addChild(this._radio);
    this._refreshOutline();
  }

  private _handleLivePress(): void {
    // RadioButtonComponent is intentionally decoupled — pressing it
    // doesn't auto-select. For the standalone-button demo we flip the
    // local state and forward the user-facing event.
    this._selected = !this._selected;
    this._radio?.setSelected(this._selected);
    this._firePress();
  }

  private _refreshOutline(): void {
    this._outline?.removeFromParent();
    this._outline?.destroy();
    this._outline = null;
    if (!this._outlineVisible || !this._radio || !this._config) return;

    const bounds = this._radio.getLocalBounds();
    const w = Math.max(1, bounds.width);
    const h = Math.max(1, bounds.height);
    const outline = new PIXI.Graphics();
    outline.eventMode = "none";
    outline
      .rect(bounds.x, bounds.y, w, h)
      .stroke({ color: this._config.outlineColor, width: this._config.outlineWidth });
    this._radio.addChild(outline);
    this._outline = outline;
  }
}
