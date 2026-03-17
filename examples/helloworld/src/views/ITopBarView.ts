import type { IView } from "gamelabsjs";

export type Unsubscribe = () => void;

export interface ITopBarView extends IView {
  onToggleColor(cb: () => void): Unsubscribe;
  onToggleRotation(cb: () => void): Unsubscribe;
  onToggleDebug(cb: () => void): Unsubscribe;
  resize(width: number, height: number): void;
}

