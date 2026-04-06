import type { IScreenView, Unsubscribe } from "gamelabsjs";

export interface IGameScreenView extends IScreenView {
  showWaveText(wave: number): void;
  hideWaveText(): void;
  setWave(wave: number): void;
  onDirectionInput(cb: (dx: number, dy: number) => void): Unsubscribe;
}
