import type { IAssetManager, IInputManager } from "@gamebyte/gamelabsjs";
import { GridCellObjectOptions, GridItemObjectOptions, GridObjectCreator, type IGridObjectListener } from "@gamebyte/gamelabsjs";
import type { BlockPuzzleConfig } from "../../../BlockPuzzleConfig";
import { GameBoardCellObject } from "./GameBoardCellObject";
import { GameBoardItemObject } from "./GameBoardItemObject";
import { GameBoardItemObjectOptions } from "./GameBoardItemObjectOptions";

/**
 * Dispatches per-surface cell + item visuals.
 *
 * Cells:
 * - Each cell's palette is resolved from `options.gridId` via
 *   `BlockPuzzleConfig.boardKindFor`. Same creator handles the
 *   playing grid and the tray.
 *
 * Items:
 * - The controller threads `GameBoardItemObjectOptions` (carrying
 *   the piece type + per-surface block size) through to the visual,
 *   so the same `GameBoardItemObject` renders any piece on any
 *   surface without per-shape branching here.
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

  public override createItemObject(
    options: GridItemObjectOptions,
    pointerListener: IGridObjectListener,
    inputManager: IInputManager | null,
    assetManager?: IAssetManager | null,
  ): GameBoardItemObject {
    if (!(options instanceof GameBoardItemObjectOptions)) {
      throw new Error("GameBoardObjectCreator: expected GameBoardItemObjectOptions — check GameBoardsViewController.createItemObjectOption");
    }
    return new GameBoardItemObject(options, pointerListener, inputManager, assetManager ?? null);
  }
}
