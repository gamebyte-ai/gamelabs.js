import type { IAssetManager, IInputManager } from "@gamebyte/gamelabsjs";
import { GridCellObjectOptions, GridObjectCreator, type IGridObjectListener } from "@gamebyte/gamelabsjs";
import type { BlockPuzzleConfig } from "../../../BlockPuzzleConfig";
import { GameBoardCellObject } from "./GameBoardCellObject";

/**
 * Dispatches cell visuals per grid surface.
 *
 * Both the playing grid and the tray flow through the same
 * `GridsViewController` auto-sync pipeline; the creator is what gives
 * each surface its own palette by mapping `options.gridId` →
 * `BoardKind` → `BlockPuzzleConfig.palettes`. The item-creation path
 * is intentionally not overridden in step 1 — no piece visuals exist
 * yet, and the framework default item visual is never instantiated
 * because no items are added to either grid.
 */
export class GameBoardObjectCreator extends GridObjectCreator {
  private readonly _config: BlockPuzzleConfig;

  public constructor(config: BlockPuzzleConfig) {
    super();
    this._config = config;
  }

  public override createCellObject(
    options: GridCellObjectOptions,
    pointerListener: IGridObjectListener,
    inputManager: IInputManager | null,
    assetManager?: IAssetManager | null,
  ): GameBoardCellObject {
    const kind = this._config.boardKindFor(options.gridId);
    const palette = this._config.palettes[kind];
    return new GameBoardCellObject(options, pointerListener, inputManager, assetManager ?? null, palette);
  }
}
