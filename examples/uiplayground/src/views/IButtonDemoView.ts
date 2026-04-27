import type { IView, Unsubscribe } from "@gamebyte/gamelabsjs";

/**
 * Live preview surface for the Button demo. The view owns the
 * `ButtonComponent` instance; the controller reshapes it via these
 * setters and listens for press events.
 *
 * Because `ButtonComponent` only exposes runtime setters for
 * `label` + `texture`, every other prop change rebuilds the underlying
 * component internally — that's a view-side concern hidden behind this
 * interface.
 */
export interface IButtonDemoView extends IView {
  setWidth(width: number): void;
  setHeight(height: number): void;
  setRadius(radius: number): void;
  setFillColor(color: number): void;
  setLabel(label: string): void;
  /** Fires whenever the live button is pressed by the user. */
  onPress(cb: () => void): Unsubscribe;
}
