import type { IScreenView, Unsubscribe } from "gamelabsjs";

export interface IGameScreenView extends IScreenView {
  setScore(score: number): void;
  setBest(best: number): void;
  showGameOver(visible: boolean): void;
  onSettingsTapped(cb: () => void): Unsubscribe;
  onRestartTapped(cb: () => void): Unsubscribe;
}
