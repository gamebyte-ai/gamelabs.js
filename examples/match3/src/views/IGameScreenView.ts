import type { IScreenView } from "@gamebyte/gamelabsjs";

export interface IGameScreenView extends IScreenView {
  setScore(score: number): void;
}
