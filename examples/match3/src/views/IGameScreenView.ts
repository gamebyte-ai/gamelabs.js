import type { IView } from "gamelabsjs";

export interface IGameScreenView extends IView {
  setScore(score: number): void;
}
