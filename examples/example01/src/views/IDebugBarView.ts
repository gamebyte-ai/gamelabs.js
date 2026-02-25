import type { IView } from "gamelabsjs";

export type Unsubscribe = () => void;

export interface IDebugBarView extends IView {
  onToggleGroundGrid(cb: () => void): Unsubscribe;
  onToggleStats(cb: () => void): Unsubscribe;
  onToggleLog(cb: () => void): Unsubscribe;
  setBarVisible(visible: boolean): void;
  resize(width: number, height: number): void;
}

