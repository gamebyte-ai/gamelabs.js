import type { IPopupView, Unsubscribe } from "gamelabsjs";

export interface IGameOverPopupView extends IPopupView {
  setWave(wave: number): void;
  onPlayAgain(cb: () => void): Unsubscribe;
}
