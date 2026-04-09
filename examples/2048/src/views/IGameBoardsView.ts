import type { IGridView } from "gamelabsjs";
import type { MovePlan, SpawnResult } from "../utilities/Game2048GridService.js";

export interface IGameBoardsView extends IGridView {
  animateMove(gridId: number, plan: MovePlan): Promise<void>;
  animateMergePops(gridId: number, plan: MovePlan): Promise<void>;
  animateSpawn(gridId: number, spawn: SpawnResult): Promise<void>;
}
