import { AssetRequest, AssetTypes, GameGridBinding } from "gamelabsjs";
import { TicTacToeAssetIds } from "./TicTacToeAssetIds";
import { TicTacToeGridObjectCreator } from "./views/TicTacToeGridObjectCreator";
import { TicTacToeGameGridView } from "./views/TicTacToeGameGridView.three";
import { TicTacToeGameGridController } from "./controllers/TicTacToeGameGridController";

export class TicTacToeGameGridBinding extends GameGridBinding {
  public constructor() {
    super(new TicTacToeGridObjectCreator(), TicTacToeGameGridView, TicTacToeGameGridController);
    this.assetRequestList.addRequest(new AssetRequest(AssetTypes.WorldTexture, TicTacToeAssetIds.Cell, new URL("./assets/cell.png", import.meta.url).href));
  }
}
