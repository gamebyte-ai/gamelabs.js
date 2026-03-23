import type { IScreenView } from "gamelabsjs";

export interface IGameScreenView extends IScreenView {
  setScore(score: number): void;
}
