import type { IInstanceResolver } from "../../../../core/di/IInstanceResolver.js";
import type { IViewController } from "../../../../core/views/IViewController.js";
import { GameGridModel } from "../models/GameGridModel.js";
import { GameGridEvents } from "../events/GameGridEvents.js";
import type { IGameGridView } from "../views/IGameGridView.js";
import { UnsubscribeBag } from "../../../../core/events/subscriptions.js";

export class GameGridController implements IViewController<IGameGridView> {
  private _view: IGameGridView | null = null;
  private readonly _subs = new UnsubscribeBag();
  private _model: GameGridModel | null = null;
  private _events: GameGridEvents | null = null;

  public inject(resolver: IInstanceResolver): void {
    this._model = resolver.getInstance(GameGridModel);
    this._events = resolver.getInstance(GameGridEvents);
  }

  public initialize(view: IGameGridView): void {
    this._view = view;
    const model = this._model!;
    const events = this._events!;
    for (const grid of model.getGrids().values()) {
      view.addGrid({
        id: grid.gridId,
        columnCount: grid.columnCount,
        rowCount: grid.rowCount,
        position: grid.position,
        rotation: grid.rotation,
        preset: grid.preset
      });
      for (let col = 0; col < grid.columnCount; col++) {
        for (let row = 0; row < grid.rowCount; row++) {
          const cell = grid.getCell(col, row);
          view.updateCellItem(grid.gridId, col, row, cell?.item ?? null);
        }
      }
    }
    this._subs.add(this._events!.onGridAdded((grid) => {
      this._view?.addGrid({
        id: grid.gridId,
        columnCount: grid.columnCount,
        rowCount: grid.rowCount,
        position: grid.position,
        rotation: grid.rotation,
        preset: grid.preset
      });
      for (let col = 0; col < grid.columnCount; col++) {
        for (let row = 0; row < grid.rowCount; row++) {
          const cell = grid.getCell(col, row);
          this._view?.updateCellItem(grid.gridId, col, row, cell?.item ?? null);
        }
      }
    }));
    this._subs.add(this._events!.onGridRemoved((grid) => this._view?.removeGrid(grid.gridId)));
    this._subs.add(this._events!.onPositionChanged((grid, position) => this._view?.updateGridPosition(grid.gridId, position)));
    this._subs.add(this._events!.onRotationChanged((grid, rotation) => this._view?.updateGridRotation(grid.gridId, rotation)));
    this._subs.add(this._events!.onItemChanged((cell) => this._view?.updateCellItem(cell.grid.gridId, cell.col, cell.row, cell.item ?? null)));
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
    this._model = null;
    this._events = null;
  }
}
