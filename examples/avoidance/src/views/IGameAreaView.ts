import type { IView } from "gamelabsjs";

export interface IGameAreaView extends IView {
  setPlayerPosition(x: number, y: number): void;
  addEnemy(id: number, x: number, y: number): void;
  setEnemyPosition(id: number, x: number, y: number): void;
  removeEnemy(id: number): void;
  removeAllEnemies(): void;
}
