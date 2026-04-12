import type { IInstanceResolver } from "../../../../core/di/IInstanceResolver.js";
import type { IViewController } from "../../../../core/views/IViewController.js";
import { IGridsModel } from "../models/IGridsModel.js";
import { GridEvents } from "../events/GridEvents.js";
import type { IGridView } from "../views/IGridView.js";
import { GridItemObjectOptions } from "../views/GridItemObject.js";
import type { IGridItem } from "../models/IGridItem.js";
import type { IGrid } from "../models/IGrid.js";
import type { IGridCell } from "../models/IGridCell.js";
import { UnsubscribeBag } from "../../../../core/events/subscriptions.js";

export class GridsViewController implements IViewController<IGridView> {
  private _view: IGridView | null = null;
  private readonly _subs = new UnsubscribeBag();
  private _model: IGridsModel | null = null;
  private _events: GridEvents | null = null;

  public inject(resolver: IInstanceResolver): void {
    this._model = resolver.getInstance(IGridsModel);
    this._events = resolver.getInstance(GridEvents);
  }

  public initialize(view: IGridView): void {
    this._view = view;
    const model = this._model!;
    for (const grid of model.getGrids().values()) {
      this.syncGridToView(grid, view);
    }
    this._subs.add(this._events!.onGridAdded((grid) => this.onGridAdded(grid)));
    this._subs.add(this._events!.onGridRemoved((grid) => this._view?.removeGrid(grid.gridId)));
    this._subs.add(this._events!.onPositionChanged((grid, position) => this._view?.updateGridPosition(grid.gridId, position)));
    this._subs.add(this._events!.onRotationChanged((grid, rotation) => this._view?.updateGridRotation(grid.gridId, rotation)));
    this._subs.add(this._events!.onItemChanged((cell, oldItem, newItem) => this.onItemChanged(cell, oldItem, newItem)));
  }

  protected createItemObjectOption(item: IGridItem, grid: IGrid): GridItemObjectOptions {
    return new GridItemObjectOptions(item.itemId, grid.preset);
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
    this._model = null;
    this._events = null;
  }

  private syncGridToView(grid: IGrid, view: IGridView): void {
    view.addGrid({
      id: grid.gridId,
      columnCount: grid.columnCount,
      rowCount: grid.rowCount,
      position: grid.position,
      rotation: grid.rotation,
      preset: grid.preset,
    });
    for (let col = 0; col < grid.columnCount; col++) {
      for (let row = 0; row < grid.rowCount; row++) {
        const cell = grid.getCell(col, row);
        if (cell?.item) view.createItem(this.createItemObjectOption(cell.item, grid), grid.gridId, col, row);
      }
    }
  }

  private onGridAdded(grid: IGrid): void {
    if (this._view) this.syncGridToView(grid, this._view);
  }

  private onItemChanged(cell: IGridCell, oldItem: IGridItem | null, newItem: IGridItem | null): void {
    if (oldItem) this._view?.destroyItem(oldItem.itemId, cell.grid.gridId, cell.col, cell.row);
    if (newItem) this._view?.createItem(this.createItemObjectOption(newItem, cell.grid), cell.grid.gridId, cell.col, cell.row);
  }
}
