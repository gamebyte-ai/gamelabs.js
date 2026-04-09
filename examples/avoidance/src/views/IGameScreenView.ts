import type { IScreenView } from "@gamebyte/gamelabsjs";

export interface IGameScreenView extends IScreenView {
  showWaveText(wave: number): void;
  hideWaveText(): void;
  setWave(wave: number): void;
}
