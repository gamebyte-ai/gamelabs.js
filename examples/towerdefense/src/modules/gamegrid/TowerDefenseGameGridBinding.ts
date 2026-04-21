import { GameGridBinding } from "@gamebyte/gamelabsjs";
import { TowerDefenseConfig } from "../../TowerDefenseConfig.js";
import type { LevelManager } from "../../utilities/LevelManager.js";
import { GameBoardObjectCreator } from "./views/GameBoardObjectCreator.js";
import { GameBoardsView } from "./views/GameBoardsView.three.js";
import { GameBoardsViewController } from "./controllers/GameBoardsViewController.js";

/**
 * Registers the grid model / events and the tower-defense grid view +
 * controller. Takes the shared {@link LevelManager} so cells can colour
 * themselves and place spawn/base markers based on the current path.
 */
export class TowerDefenseGameGridBinding extends GameGridBinding {
  public constructor(config: TowerDefenseConfig, level: LevelManager) {
    super(new GameBoardObjectCreator(config, level), GameBoardsView, GameBoardsViewController);
  }
}
