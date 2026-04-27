import {
  UnsubscribeBag,
  type IInstanceResolver,
  type IViewController,
  type RadioButtonGroupItem,
} from "@gamebyte/gamelabsjs";
import {
  RADIO_GROUP_DIRECTIONS,
  RADIO_GROUP_ITEM_LIBRARY,
  RADIO_SELECTED_LABELS,
  RADIO_SELECTED_PALETTE,
  type RadioGroupDirection,
} from "../constants/DemoPresets.js";
import { IControlsManager } from "../utilities/IControlsManager.js";
import type { IRadioButtonGroupDemoView } from "../views/IRadioButtonGroupDemoView.js";

/**
 * Controller for `RadioButtonGroupDemoView`. Drives item count,
 * direction, spacing, per-button radius and selectedColor through the
 * controls panel and exposes programmatic actions for cycling and
 * clearing the selection. Live `onChange` events from the group are
 * piped into the shell's event log.
 */
export class RadioButtonGroupDemoViewController
  implements IViewController<IRadioButtonGroupDemoView>
{
  private _controls: IControlsManager | null = null;
  private _view: IRadioButtonGroupDemoView | null = null;
  private _itemCount = 3; // default: 3 items
  private _directionIndex = 0; // default: "column"
  private _selectedColorIndex = 0;
  private _selectionCycleIndex = 0; // 0 = null, 1..N = items
  private readonly _subs = new UnsubscribeBag();

  public inject(resolver: IInstanceResolver): void {
    this._controls = resolver.getInstance(IControlsManager);
  }

  public initialize(view: IRadioButtonGroupDemoView): void {
    if (!this._controls) {
      throw new Error("RadioButtonGroupDemoViewController is not initialized");
    }
    this._view = view;
    this._controls.clear();

    view.setOutlineVisible(this._controls.isOutlineVisible());
    this._subs.add(this._controls.onOutlineChanged((visible) => view.setOutlineVisible(visible)));

    view.setItems(this._currentItems());

    this._subs.add(
      this._controls.addSliderControl(
        "itemCount",
        {
          min: 1,
          max: RADIO_GROUP_ITEM_LIBRARY.length,
          step: 1,
          value: this._itemCount,
          format: (v) => `${Math.round(v)}`,
        },
        (v) => this._onItemCountChanged(v),
      ),
    );

    this._subs.add(
      this._controls.addCycleControl(
        "direction",
        RADIO_GROUP_DIRECTIONS,
        this._directionIndex,
        (direction) => direction,
        (direction, index) => this._onDirectionCycled(direction, index),
      ),
    );

    this._subs.add(
      this._controls.addSliderControl(
        "spacing",
        { min: 4, max: 32, step: 1, value: 10, format: (v) => `${Math.round(v)}px` },
        (v) => this._onSpacingChanged(v),
      ),
    );

    this._subs.add(
      this._controls.addSliderControl(
        "radius",
        { min: 6, max: 16, step: 1, value: 9, format: (v) => `${Math.round(v)}px` },
        (v) => this._onRadiusChanged(v),
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
      this._controls.addActionControl("Cycle selection (programmatic)", () =>
        this._onCycleSelectionPressed(),
      ),
    );

    this._subs.add(
      this._controls.addActionControl("Clear selection", () => this._onClearSelectionPressed()),
    );

    this._subs.add(view.onChange((id, item) => this._onLiveChange(id, item)));
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
    this._controls = null;
  }

  // ── Control handlers ────────────────────────────────────────────────

  private _onItemCountChanged(v: number): void {
    const count = Math.round(v);
    if (count === this._itemCount) return;
    this._itemCount = count;
    this._selectionCycleIndex = 0;
    this._view?.setItems(this._currentItems());
    this._controls?.appendLog(`RadioGroup → itemCount=${count}`);
  }

  private _onDirectionCycled(direction: RadioGroupDirection, index: number): void {
    this._directionIndex = index;
    this._view?.setDirection(direction);
    this._controls?.appendLog(`RadioGroup → direction=${direction}`);
  }

  private _onSpacingChanged(v: number): void {
    this._view?.setSpacing(Math.round(v));
  }

  private _onRadiusChanged(v: number): void {
    this._view?.setRadius(Math.round(v));
  }

  private _onSelectedColorCycled(index: number): void {
    this._selectedColorIndex = index;
    this._view?.setSelectedColor(RADIO_SELECTED_PALETTE[index]!);
    this._controls?.appendLog(`RadioGroup → selectedColor=${RADIO_SELECTED_LABELS[index]}`);
  }

  private _onCycleSelectionPressed(): void {
    const items = this._currentItems();
    this._selectionCycleIndex = (this._selectionCycleIndex + 1) % (items.length + 1);
    const next = this._selectionCycleIndex === 0 ? null : items[this._selectionCycleIndex - 1]!;
    this._view?.setSelectedId(next?.id ?? null);
    this._controls?.appendLog(
      next ? `RadioGroup → setSelectedId="${next.id}"` : "RadioGroup → setSelectedId=null",
    );
  }

  private _onClearSelectionPressed(): void {
    this._selectionCycleIndex = 0;
    this._view?.setSelectedId(null);
    this._controls?.appendLog("RadioGroup → setSelectedId=null");
  }

  private _onLiveChange(id: string, item: RadioButtonGroupItem): void {
    // Keep the local cycle index aligned with whatever the user picked
    // so the next "Cycle selection" press advances from there.
    const items = this._currentItems();
    const idx = items.findIndex((it) => it.id === id);
    this._selectionCycleIndex = idx === -1 ? 0 : idx + 1;
    this._controls?.appendLog(`RadioGroup → onChange id="${id}" label="${item.label}"`);
  }

  private _currentItems(): readonly RadioButtonGroupItem[] {
    return RADIO_GROUP_ITEM_LIBRARY.slice(0, this._itemCount);
  }

  private _formatSelectedColor(color: number): string {
    const idx = RADIO_SELECTED_PALETTE.indexOf(color);
    return RADIO_SELECTED_LABELS[idx] ?? `#${color.toString(16)}`;
  }
}
