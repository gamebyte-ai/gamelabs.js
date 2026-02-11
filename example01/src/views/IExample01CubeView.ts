import type { IView } from "gamelabsjs";

export interface IExample01CubeView extends IView {
  rotate(dx: number, dy: number): void;
  setColor(hex: number): void;
}

