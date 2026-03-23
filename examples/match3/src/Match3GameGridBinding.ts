import { GameGridBinding } from "gamelabsjs";
import { Match3GridsViewController } from "./controllers/Match3GridsViewController.js";
import { Match3GridObjectCreator } from "./views/Match3GridObjectCreator.js";
import { Match3GridsView } from "./views/Match3GridsView.three.js";

/**
 * Registers gamegrid {@link GridsModel} / {@link GridEvents} and the Match-3 world grid view + controller.
 */
export class Match3GameGridBinding extends GameGridBinding {
  public constructor() {
    super(new Match3GridObjectCreator(), Match3GridsView, Match3GridsViewController);
  }
}
