import type { IBaseGrid, IGridItem, IInstanceResolver, RectGridPreset } from "@gamebyte/gamelabsjs";
import { GridsViewController } from "@gamebyte/gamelabsjs";
import { BlockPuzzleConfig } from "../../../BlockPuzzleConfig";
import { GameBoardItem } from "../models/GameBoardItem";
import { GameBoardItemObjectOptions } from "../views/GameBoardItemObjectOptions";

/**
 * Boards view controller — extends the framework's
 * {@link GridsViewController} only to thread piece data into item
 * visuals. The base controller already handles every grid / item
 * mutation auto-sync; the only thing it needs from the app is the
 * concrete `GridItemObjectOptions` subclass to build.
 *
 * `createItemObjectOption` casts each `GameBoardItem` to read its
 * `pieceType`, then pulls the per-surface block size out of config
 * (`BlockPuzzleConfig.blockSizeFor`) so the visual renders at the
 * right scale on the tray vs. the playing grid.
 */
export class GameBoardsViewController extends GridsViewController {
  private _config: BlockPuzzleConfig | null = null;

  public override inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._config = resolver.getInstance(BlockPuzzleConfig);
  }

  protected override createItemObjectOption(item: IGridItem, grid: IBaseGrid): GameBoardItemObjectOptions {
    if (!(item instanceof GameBoardItem)) {
      throw new Error("GameBoardsViewController: expected GameBoardItem");
    }
    if (!this._config) {
      throw new Error("GameBoardsViewController: config not injected");
    }
    const blockSize = this._config.blockSizeFor(grid.gridId);
    // `grid.preset` is typed as the shape-agnostic `IGridPreset` on
    // the base controller. Both surfaces here use `RectGridPreset`,
    // and the item visual's `preset` is `declare`d as `RectGridPreset`
    // for that reason — so a narrowing cast at the seam is what the
    // framework expects.
    return new GameBoardItemObjectOptions(item.itemId, grid.preset as RectGridPreset, item.pieceType, item.color, blockSize);
  }

  public override destroy(): void {
    super.destroy();
    this._config = null;
  }
}
