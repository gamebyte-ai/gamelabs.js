import { AssetRequest, AssetTypes, GameGridBinding } from "gamelabsjs";
import { TicTacToeAssetIds } from "./TicTacToeAssetIds";
import { GameGridObjectCreator } from "./views/GameGridObjectCreator";
import { GameGridsView } from "./views/GameGridsView.three";
import { GameGridsViewController } from "./controllers/GameGridsViewController";

export class TicTacToeGameGridBinding extends GameGridBinding {
  public constructor() {
    super(new GameGridObjectCreator(), GameGridsView, GameGridsViewController);
    this.assetRequestList.addRequest(new AssetRequest(AssetTypes.WorldTexture, TicTacToeAssetIds.Cell, new URL("./assets/cell.png", import.meta.url).href));
  }
}
