import { GameGridBinding } from "@gamebyte/gamelabsjs";
import type { BlockPuzzleConfig } from "../../BlockPuzzleConfig";
import { GameBoardObjectCreator } from "./views/GameBoardObjectCreator";

/**
 * App-side override of the gamegrid binding.
 *
 * Step 1 keeps the framework's default `GridsView` + `GridsViewController`
 * — there are no animations, no pointer events, and no item visuals
 * yet, so the auto-sync pipeline is sufficient. Only the creator is
 * swapped to render grid vs tray cells with the configured palettes.
 */
export class BlockPuzzleGameGridBinding extends GameGridBinding {
  public constructor(config: BlockPuzzleConfig) {
    super(new GameBoardObjectCreator(config));
  }
}
