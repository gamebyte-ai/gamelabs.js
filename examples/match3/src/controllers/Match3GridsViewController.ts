import type { Grid, GridItem, IGridView, IInstanceResolver } from "gamelabsjs";
import { GridsViewController } from "gamelabsjs";
import { Match3Config } from "../Match3Config.js";
import { Match3GridItem } from "../models/Match3GridItem.js";
import { Match3GridService } from "../services/Match3GridService.js";
import { Match3HudSignals } from "../services/Match3HudSignals.js";
import { Match3GemItemObjectOptions } from "../views/Match3GemItemObjectOptions.js";
import { Match3GridsView } from "../views/Match3GridsView.three.js";

export class Match3GridsViewController extends GridsViewController {
  private _gridService: Match3GridService | null = null;
  private _config: Match3Config | null = null;
  private _hudSignals: Match3HudSignals | null = null;
  private _gridsView: Match3GridsView | null = null;
  private _selected: { col: number; row: number } | null = null;
  private _inputLocked = false;

  public override inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._gridService = resolver.getInstance(Match3GridService);
    this._config = resolver.getInstance(Match3Config);
    this._hudSignals = resolver.getInstance(Match3HudSignals);
  }

  public override initialize(view: IGridView): void {
    super.initialize(view);
    if (view instanceof Match3GridsView) {
      this._gridsView = view;
      view.setCellPointerDownHandler((gridId, col, row) => this._onGridCellPointerDown(gridId, col, row));
    }
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
    const signals = this._hudSignals;
    if (!svc || !cfg || !view || !signals || this._inputLocked) return;
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
          await this._runMatchCascade(svc, signals, view, gridId);
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

  private async _runMatchCascade(svc: Match3GridService, signals: Match3HudSignals, view: Match3GridsView, gridId: number): Promise<void> {
    while (svc.findMatches().length > 0) {
      const matches = svc.findMatches();
      await view.animateClearMatches(gridId, matches);
      svc.clearMatchedCells(matches);
      signals.notifyScore(svc.score);
      const moves = svc.applyGravity();
      await view.animateGravityMoves(gridId, moves);
      const spawns = svc.refillEmpty();
      await view.animateRefillSpawns(gridId, spawns);
      signals.notifyScore(svc.score);
    }
  }

  public override destroy(): void {
    this._gridsView?.setCellPointerDownHandler(null);
    this._gridsView = null;
    this._gridService = null;
    this._config = null;
    this._hudSignals = null;
    this._selected = null;
    super.destroy();
  }
}
