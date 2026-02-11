import type { IView } from "gamelabsjs";

export type Unsubscribe = () => void;

export interface IExample01TopBarView extends IView {
  onToggleColor(cb: () => void): Unsubscribe;
  resize(width: number, height: number): void;
}

