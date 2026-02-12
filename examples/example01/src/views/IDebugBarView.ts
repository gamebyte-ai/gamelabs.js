import type { IView } from "gamelabsjs";

export type Unsubscribe = () => void;

export interface IDebugBarView extends IView {
  onToggleDebug(cb: () => void): Unsubscribe;
  onToggleGroundGrid(cb: () => void): Unsubscribe;
  setBarVisible(visible: boolean): void;
  resize(width: number, height: number): void;
}

