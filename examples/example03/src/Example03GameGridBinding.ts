import { GameGridBinding } from "gamelabsjs";
import { Example03GridObjectCreator } from "./views/Example03GridObjectCreator";
import { Example03GameGridView } from "./views/Example03GameGridView.three";
import { Example03GameGridController } from "./controllers/Example03GameGridController";

export class Example03GameGridBinding extends GameGridBinding {
  public constructor() {
    super(new Example03GridObjectCreator(), Example03GameGridView, Example03GameGridController);
  }
}
