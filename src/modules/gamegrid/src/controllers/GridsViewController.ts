import type { IInstanceResolver } from "../../../../core/di/IInstanceResolver.js";
import type { IViewController } from "../../../../core/views/IViewController.js";
import { GridsModel } from "../models/GridsModel.js";
import { GridEvents } from "../events/GridEvents.js";
import type { IGridView } from "../views/IGridView.js";
import { GridItemObjectOptions } from "../views/GridItemObject.js";
import type { GridItem } from "../models/GridItem.js";
import type { Grid } from "../models/Grid.js";
import { UnsubscribeBag } from "../../../../core/events/subscriptions.js";

export class GridsViewController implements IViewController<IGridView> {
  private _view: IGridView | null = null;
  private readonly _subs = new UnsubscribeBag();
  private _model: GridsModel | null = null;
  private _events: GridEvents | null = null;

  public inject(resolver: IInstanceResolver): void {
    this._model = resolver.getInstance(GridsModel);
    this._events = resolver.getInstance(GridEvents);
  }

  public initialize(view: IGridView): void {
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
          if (cell?.item) view.createItem(this.createItemObjectOption(cell.item, grid), grid.gridId, col, row);
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
          if (cell?.item) this._view?.createItem(this.createItemObjectOption(cell.item, grid), grid.gridId, col, row);
        }
      }
    }));
    this._subs.add(this._events!.onGridRemoved((grid) => this._view?.removeGrid(grid.gridId)));
    this._subs.add(this._events!.onPositionChanged((grid, position) => this._view?.updateGridPosition(grid.gridId, position)));
    this._subs.add(this._events!.onRotationChanged((grid, rotation) => this._view?.updateGridRotation(grid.gridId, rotation)));
    this._subs.add(this._events!.onItemChanged((cell, oldItem, newItem) => {
      if (oldItem && !newItem) this._view?.destroyItem(oldItem.itemId, cell.grid.gridId, cell.col, cell.row);
      else if (!oldItem && newItem) this._view?.createItem(this.createItemObjectOption(newItem, cell.grid), cell.grid.gridId, cell.col, cell.row);
      else if (oldItem && newItem) {
        this._view?.destroyItem(oldItem.itemId, cell.grid.gridId, cell.col, cell.row);
        this._view?.createItem(this.createItemObjectOption(newItem, cell.grid), cell.grid.gridId, cell.col, cell.row);
      }
    }));
  }

  protected createItemObjectOption(item: GridItem, grid: Grid): GridItemObjectOptions {
    return new GridItemObjectOptions(item.itemId, grid.preset);
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
    this._model = null;
    this._events = null;
  }
}
