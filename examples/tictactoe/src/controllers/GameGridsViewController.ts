import type { Grid } from "gamelabsjs";
import type { GridItem } from "gamelabsjs";
import type { IInstanceResolver } from "gamelabsjs";
import { GridsViewController } from "gamelabsjs";
import { GameItem } from "../models/GameItem.js";
import { GameItemObjectOptions } from "../views/GameItemObjectOptions.js";
import { GameGridsView } from "../views/GameGridsView.three.js";
import { TicTacToeTurnManagerToken, type TicTacToeTurnManager } from "../utilities/TicTacToeTurnManager.js";
import { TicTacToeConfig } from "../TicTacToeConfig.js";

export class GameGridsViewController extends GridsViewController {
  private _turnManager: TicTacToeTurnManager | null = null;
  private _config: TicTacToeConfig | null = null;

  public override inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._turnManager = resolver.getInstance(TicTacToeTurnManagerToken);
    this._config = resolver.getInstance(TicTacToeConfig);
  }

  public override initialize(view: import("gamelabsjs").IGridView): void {
    super.initialize(view);
    if (view instanceof GameGridsView) {
      view.setCellPointerDownHandler((gridId, col, row) => this._handleCellPointerDown(gridId, col, row));
    }
  }

  protected override createItemObjectOption(item: GridItem, grid: Grid): GameItemObjectOptions {
    if (!(item instanceof GameItem)) throw new Error("Expected GameItem");
    return new GameItemObjectOptions(item.itemId, grid.preset, item.team);
  }

  private _handleCellPointerDown(gridId: number, col: number, row: number): void {
    if (gridId !== this._config?.boardId) return;
    this._turnManager?.placeMark(gridId, col, row);
  }

  public override destroy(): void {
    super.destroy();
    this._turnManager = null;
    this._config = null;
  }
}
