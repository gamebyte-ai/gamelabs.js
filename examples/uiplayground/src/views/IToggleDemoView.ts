import type { IView, Unsubscribe } from "@gamebyte/gamelabsjs";

export interface IToggleDemoView extends IView {
  setWidth(width: number): void;
  setHeight(height: number): void;
  setOnColor(color: number): void;
  /** Programmatically flip the toggle (also fires `onChange`). */
  toggle(): void;
  /** Fires whenever the live toggle changes state. */
  onChange(cb: (value: boolean) => void): Unsubscribe;
}
