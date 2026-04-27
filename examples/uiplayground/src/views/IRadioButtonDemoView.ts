import type { IView, Unsubscribe } from "@gamebyte/gamelabsjs";

/**
 * Live preview surface for the RadioButton demo. The view owns the
 * `RadioButtonComponent` instance and rebuilds it on every constructor-only
 * tweak (radius / innerRadius / gap / selectedColor / label /
 * borderWidth — i.e. nearly all of them); only `selected` mutates
 * through the live instance via `setSelected`.
 */
export interface IRadioButtonDemoView extends IView {
  setRadius(radius: number): void;
  setInnerRadius(innerRadius: number): void;
  setBorderWidth(width: number): void;
  setGap(gap: number): void;
  setSelectedColor(color: number): void;
  setLabel(label: string): void;
  /** Flip the selected state programmatically (uses the component's `setSelected`). */
  toggleSelected(): void;
  setOutlineVisible(visible: boolean): void;
  /** Fires whenever the user taps the radio button's hit area. */
  onPress(cb: () => void): Unsubscribe;
}
