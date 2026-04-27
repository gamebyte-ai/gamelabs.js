import {
  UnsubscribeBag,
  type IInstanceResolver,
  type IViewController,
} from "@gamebyte/gamelabsjs";
import {
  RADIO_LABEL_PRESETS,
  RADIO_SELECTED_LABELS,
  RADIO_SELECTED_PALETTE,
} from "../constants/DemoPresets.js";
import { IControlsManager } from "../utilities/IControlsManager.js";
import type { IRadioButtonDemoView } from "../views/IRadioButtonDemoView.js";

/**
 * Controller for `RadioButtonDemoView`. Drives radius / innerRadius /
 * borderWidth / gap / selectedColor / label through the controls
 * panel, plus a "toggle selected" action that exercises the
 * component's silent `setSelected` API.
 */
export class RadioButtonDemoViewController implements IViewController<IRadioButtonDemoView> {
  private _controls: IControlsManager | null = null;
  private _view: IRadioButtonDemoView | null = null;
  private _selectedColorIndex = 0;
  private _labelIndex = 0;
  private readonly _subs = new UnsubscribeBag();

  public inject(resolver: IInstanceResolver): void {
    this._controls = resolver.getInstance(IControlsManager);
  }

  public initialize(view: IRadioButtonDemoView): void {
    if (!this._controls) {
      throw new Error("RadioButtonDemoViewController is not initialized");
    }
    this._view = view;
    this._controls.clear();

    view.setOutlineVisible(this._controls.isOutlineVisible());
    this._subs.add(this._controls.onOutlineChanged((visible) => view.setOutlineVisible(visible)));

    this._subs.add(
      this._controls.addSliderControl(
        "radius",
        { min: 6, max: 16, step: 1, value: 9, format: (v) => `${Math.round(v)}px` },
        (v) => this._onRadiusChanged(v),
      ),
    );

    this._subs.add(
      this._controls.addSliderControl(
        "innerRadius",
        { min: 2, max: 10, step: 1, value: 4, format: (v) => `${Math.round(v)}px` },
        (v) => this._onInnerRadiusChanged(v),
      ),
    );

    this._subs.add(
      this._controls.addSliderControl(
        "borderWidth",
        { min: 1, max: 4, step: 1, value: 2, format: (v) => `${Math.round(v)}px` },
        (v) => this._onBorderWidthChanged(v),
      ),
    );

    this._subs.add(
      this._controls.addSliderControl(
        "gap",
        { min: 4, max: 16, step: 1, value: 8, format: (v) => `${Math.round(v)}px` },
        (v) => this._onGapChanged(v),
      ),
    );

    this._subs.add(
      this._controls.addCycleControl(
        "selectedColor",
        RADIO_SELECTED_PALETTE,
        this._selectedColorIndex,
        (color) => this._formatSelectedColor(color),
        (_color, index) => this._onSelectedColorCycled(index),
      ),
    );

    this._subs.add(
      this._controls.addCycleControl(
        "label",
        RADIO_LABEL_PRESETS,
        this._labelIndex,
        (text) => text,
        (text) => this._onLabelCycled(text),
      ),
    );

    this._subs.add(
      this._controls.addActionControl("Toggle selected (programmatic)", () =>
        this._onToggleSelectedPressed(),
      ),
    );

    this._subs.add(view.onPress(() => this._onLivePress()));
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
    this._controls = null;
  }

  // ── Control handlers ────────────────────────────────────────────────

  private _onRadiusChanged(v: number): void {
    this._view?.setRadius(Math.round(v));
  }

  private _onInnerRadiusChanged(v: number): void {
    this._view?.setInnerRadius(Math.round(v));
  }

  private _onBorderWidthChanged(v: number): void {
    this._view?.setBorderWidth(Math.round(v));
  }

  private _onGapChanged(v: number): void {
    this._view?.setGap(Math.round(v));
  }

  private _onSelectedColorCycled(index: number): void {
    this._selectedColorIndex = index;
    this._view?.setSelectedColor(RADIO_SELECTED_PALETTE[index]!);
    this._controls?.appendLog(`RadioButton → selectedColor=${RADIO_SELECTED_LABELS[index]}`);
  }

  private _onLabelCycled(text: string): void {
    this._labelIndex = RADIO_LABEL_PRESETS.indexOf(text);
    this._view?.setLabel(text);
  }

  private _onToggleSelectedPressed(): void {
    this._view?.toggleSelected();
    this._controls?.appendLog("RadioButton → setSelected (programmatic toggle)");
  }

  private _onLivePress(): void {
    this._controls?.appendLog("RadioButton → onPress");
  }

  private _formatSelectedColor(color: number): string {
    const idx = RADIO_SELECTED_PALETTE.indexOf(color);
    return RADIO_SELECTED_LABELS[idx] ?? `#${color.toString(16)}`;
  }
}
