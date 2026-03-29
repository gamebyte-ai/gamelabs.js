import type { IView, Unsubscribe } from "gamelabsjs";

export interface ICubeView extends IView {
  rotate(dx: number, dy: number): void;
  setColor(hex: number): void;
  onDrag(cb: (dx: number, dy: number) => void): Unsubscribe;
}
