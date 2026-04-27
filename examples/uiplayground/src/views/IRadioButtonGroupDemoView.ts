import type { IView, RadioButtonGroupItem, Unsubscribe } from "@gamebyte/gamelabsjs";
import type { RadioGroupDirection } from "../constants/DemoPresets.js";

/**
 * Live preview surface for the RadioButtonGroup demo. The view owns the
 * `RadioButtonGroupComponent` instance and rebuilds it whenever a
 * constructor-only prop (direction / spacing / per-button style) changes;
 * items + selection flow through to the live instance via setItems /
 * setSelectedId.
 */
export interface IRadioButtonGroupDemoView extends IView {
  setItems(items: readonly RadioButtonGroupItem[]): void;
  setDirection(direction: RadioGroupDirection): void;
  setSpacing(spacing: number): void;
  /** Forwarded to every child button's `radius`. */
  setRadius(radius: number): void;
  /** Forwarded to every child button's `selectedColor`. */
  setSelectedColor(color: number): void;
  setSelectedId(id: string | null): void;
  setOutlineVisible(visible: boolean): void;
  /** Fires whenever the user picks a different option. */
  onChange(cb: (id: string, item: RadioButtonGroupItem) => void): Unsubscribe;
}
