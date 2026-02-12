import type { IView } from "gamelabsjs";

export interface ICubeView extends IView {
  rotate(dx: number, dy: number): void;
  setColor(hex: number): void;
}

