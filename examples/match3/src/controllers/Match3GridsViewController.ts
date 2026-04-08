import type { Grid, GridItem, IGridView, IInstanceResolver } from "@gamebyte/gamelabsjs";
import { GridsViewController } from "@gamebyte/gamelabsjs";
import { Match3Config } from "../Match3Config.js";
import { Match3GridItem } from "../models/Match3GridItem.js";
import { Match3GridService } from "../utilities/Match3GridService.js";
import { Match3Events } from "../events/Match3Events.js";
import { Match3GemItemObjectOptions } from "../views/Match3GemItemObjectOptions.js";
import type { IMatch3GridsView } from "../views/IMatch3GridsView.js";

export class Match3GridsViewController extends GridsViewController {
  private _gridService: Match3GridService | null = null;
  private _config: Match3Config | null = null;
  private _match3Events: Match3Events | null = null;
  private _gridsView: IMatch3GridsView | null = null;
  private _selected: { col: number; row: number } | null = null;
  private _inputLocked = false;

  public override inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._gridService = resolver.getInstance(Match3GridService);
    this._config = resolver.getInstance(Match3Config);
    this._match3Events = resolver.getInstance(Match3Events);
  }

  public override initialize(view: IGridView): void {
    super.initialize(view);
    this._gridsView = view as IMatch3GridsView;
    this._gridsView.setCellPointerDownHandler((gridId, col, row) => this._onGridCellPointerDown(gridId, col, row));
  }

  protected override createItemObjectOption(item: GridItem, grid: Grid): Match3GemItemObjectOptions {
    if (!(item instanceof Match3GridItem)) throw new Error("Expected Match3GridItem");
    return new Match3GemItemObjectOptions(item.itemId, grid.preset, item.gemType);
  }

  private _onGridCellPointerDown(gridId: number, col: number, row: number): void {
    void this._handleGridCellAsync(gridId, col, row);
  }

  private async _handleGridCellAsync(gridId: number, col: number, row: number): Promise<void> {
    const svc = this._gridService;
    const cfg = this._config;
    const view = this._gridsView;
    const events = this._match3Events;
    if (!svc || !cfg || !view || !events || this._inputLocked) return;
    if (gridId !== Match3Config.GRID_ID) return;

    if (this._selected === null) {
      this._selected = { col, row };
      view.updateGemSelection(gridId, this._selected);
      return;
    }

    if (this._selected.col === col && this._selected.row === row) {
      this._selected = null;
      view.updateGemSelection(gridId, null);
      return;
    }

    const r0 = this._selected.row;
    const c0 = this._selected.col;
    if (svc.isAdjacent(r0, c0, row, col)) {
      this._selected = null;
      view.updateGemSelection(gridId, null);
      this._inputLocked = true;
      try {
        const gridId = Match3Config.GRID_ID;
        if (svc.peekSwapCreatesMatch(r0, c0, row, col)) {
          await view.animateValidSwap(gridId, r0, c0, row, col);
          svc.applySwap(r0, c0, row, col);
          await this._runMatchCascade(svc, events, view, gridId);
        } else {
          await view.animateInvalidSwap(gridId, r0, c0, row, col);
        }
      } finally {
        this._inputLocked = false;
      }
      return;
    }

    this._selected = { col, row };
    view.updateGemSelection(gridId, this._selected);
  }

  private async _runMatchCascade(svc: Match3GridService, events: Match3Events, view: IMatch3GridsView, gridId: number): Promise<void> {
    while (svc.findMatches().length > 0) {
      const matches = svc.findMatches();
      await view.animateClearMatches(gridId, matches);
      svc.clearMatchedCells(matches);
      events.emitScoreChanged(svc.score);
      const moves = svc.applyGravity();
      await view.animateGravityMoves(gridId, moves);
      const spawns = svc.refillEmpty();
      await view.animateRefillSpawns(gridId, spawns);
      events.emitScoreChanged(svc.score);
    }
  }

  public override destroy(): void {
    this._gridsView?.setCellPointerDownHandler(null);
    this._gridsView = null;
    this._gridService = null;
    this._config = null;
    this._match3Events = null;
    this._selected = null;
    super.destroy();
  }
}
