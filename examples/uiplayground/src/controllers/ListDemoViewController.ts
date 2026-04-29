import {
  UnsubscribeBag,
  type IInstanceResolver,
  type IViewController,
  type ListItem,
} from "@gamebyte/gamelabsjs";
import {
  LIST_SELECTION_MODES,
  LIST_VARIANTS,
  RADIO_SELECTED_LABELS,
  RADIO_SELECTED_PALETTE,
  type ListSelectionModePreset,
  type ListVariantPreset,
} from "../constants/DemoPresets.js";
import { IControlsManager } from "../utilities/IControlsManager.js";
import type { IListDemoView } from "../views/IListDemoView.js";

/**
 * Controller for `ListDemoView`. Drives variant, selection mode,
 * item count, item height, and selectedColor through the controls
 * panel and exposes a "Clear selection" programmatic action. Live
 * `onChange` and `onItemPress` events from the list are piped into
 * the shell's event log so the developer can see exactly when each
 * fires (handy when comparing the three selection modes).
 */
export class ListDemoViewController implements IViewController<IListDemoView> {
  private _controls: IControlsManager | null = null;
  private _view: IListDemoView | null = null;
  private _variantIndex = 0; // default: "text"
  private _selectionModeIndex = 0; // default: "none"
  private _selectedColorIndex = 0;
  private readonly _subs = new UnsubscribeBag();

  public inject(resolver: IInstanceResolver): void {
    this._controls = resolver.getInstance(IControlsManager);
  }

  public initialize(view: IListDemoView): void {
    if (!this._controls) {
      throw new Error("ListDemoViewController is not initialized");
    }
    this._view = view;
    this._controls.clear();

    view.setOutlineVisible(this._controls.isOutlineVisible());
    this._subs.add(this._controls.onOutlineChanged((visible) => view.setOutlineVisible(visible)));

    this._subs.add(
      this._controls.addCycleControl(
        "variant",
        LIST_VARIANTS,
        this._variantIndex,
        (variant) => variant,
        (variant, index) => this._onVariantCycled(variant, index),
      ),
    );

    this._subs.add(
      this._controls.addCycleControl(
        "selectionMode",
        LIST_SELECTION_MODES,
        this._selectionModeIndex,
        (mode) => mode,
        (mode, index) => this._onSelectionModeCycled(mode, index),
      ),
    );

    this._subs.add(
      this._controls.addSliderControl(
        "itemCount",
        { min: 1, max: 30, step: 1, value: 6, format: (v) => `${Math.round(v)}` },
        (v) => this._onItemCountChanged(v),
      ),
    );

    this._subs.add(
      this._controls.addSliderControl(
        "itemHeight",
        { min: 24, max: 72, step: 2, value: 36, format: (v) => `${Math.round(v)}px` },
        (v) => this._onItemHeightChanged(v),
      ),
    );

    this._subs.add(
      this._controls.addRadioGroupControl(
        "selectedColor",
        RADIO_SELECTED_PALETTE,
        this._selectedColorIndex,
        (color) => this._formatSelectedColor(color),
        (_color, index) => this._onSelectedColorCycled(index),
      ),
    );

    this._subs.add(
      this._controls.addActionControl("Clear selection", () => this._onClearSelectionPressed()),
    );

    this._subs.add(view.onChange((ids, items) => this._onLiveChange(ids, items)));
    this._subs.add(view.onItemPress((id, item) => this._onLivePress(id, item)));
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
    this._controls = null;
  }

  // ── Control handlers ────────────────────────────────────────────────

  private _onVariantCycled(value: ListVariantPreset, index: number): void {
    this._variantIndex = index;
    this._view?.setVariant(value);
    this._controls?.appendLog(`List → variant=${value}`);
  }

  private _onSelectionModeCycled(value: ListSelectionModePreset, index: number): void {
    this._selectionModeIndex = index;
    this._view?.setSelectionMode(value);
    this._controls?.appendLog(`List → selectionMode=${value}`);
  }

  private _onItemCountChanged(v: number): void {
    this._view?.setItemCount(Math.round(v));
  }

  private _onItemHeightChanged(v: number): void {
    this._view?.setItemHeight(Math.round(v));
  }

  private _onSelectedColorCycled(index: number): void {
    this._selectedColorIndex = index;
    this._view?.setSelectedColor(RADIO_SELECTED_PALETTE[index]!);
    this._controls?.appendLog(`List → selectedColor=${RADIO_SELECTED_LABELS[index]}`);
  }

  private _onClearSelectionPressed(): void {
    this._view?.clearSelection();
    this._controls?.appendLog("List → setSelectedIds=[] (programmatic)");
  }

  private _onLiveChange(ids: readonly string[], _items: readonly ListItem[]): void {
    this._controls?.appendLog(`List → onChange selected=[${ids.join(", ")}]`);
  }

  private _onLivePress(id: string, item: ListItem): void {
    this._controls?.appendLog(`List → onItemPress id="${id}" label="${item.label ?? ""}"`);
  }

  private _formatSelectedColor(color: number): string {
    const idx = RADIO_SELECTED_PALETTE.indexOf(color);
    return RADIO_SELECTED_LABELS[idx] ?? `#${color.toString(16)}`;
  }
}
