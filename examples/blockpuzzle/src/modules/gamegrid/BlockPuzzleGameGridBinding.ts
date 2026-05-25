import { GameGridBinding } from "@gamebyte/gamelabsjs";
import type { BlockPuzzleConfig } from "../../BlockPuzzleConfig";
import { GameBoardsViewController } from "./controllers/GameBoardsViewController";
import { GameBoardObjectCreator } from "./views/GameBoardObjectCreator";

/**
 * App-side override of the gamegrid binding.
 *
 * - **Creator**: swapped for `GameBoardObjectCreator` so cells render
 *   with the per-surface palette and items render the piece shape.
 * - **Controller**: swapped for `GameBoardsViewController`, which
 *   threads `pieceType` + per-surface `blockSize` into item options.
 * - **View**: still the framework default `GridsView`. Step 2 has no
 *   animations or pointer handling on the world view, so the stock
 *   auto-sync pipeline is sufficient.
 */
export class BlockPuzzleGameGridBinding extends GameGridBinding {
  public constructor(config: BlockPuzzleConfig) {
    super(new GameBoardObjectCreator(config), null, GameBoardsViewController);
  }
}
