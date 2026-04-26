import type { IInstanceResolver } from "../../../../../core/di/IInstanceResolver.js";
import type { IViewController } from "../../../../../core/views/IViewController.js";
import { UnsubscribeBag } from "../../../../../core/events/subscriptions.js";
import { GridEvents } from "../events/GridEvents.js";
import { IGridsModel } from "../models/IGridsModel.js";
import type { IBaseGrid } from "../models/IBaseGrid.js";
import type { IGridCell } from "../models/IGridCell.js";
import type { IGridItem } from "../models/IGridItem.js";
import type { IGridView } from "../views/IGridView.js";
import { GridItemObjectOptions } from "../views/GridItemObject.js";

/**
 * Shape-agnostic view controller for grids.
 *
 * Subscribes to {@link GridEvents} and forwards every grid mutation to
 * the registered {@link IGridView} regardless of grid shape (rect or
 * hex). Layout flows through `grid.preset` (`IGridPreset`), so the
 * controller never needs to know which shape it's handling. Apps
 * subclass and override {@link createItemObjectOption} to attach
 * shape-specific metadata to item visuals — they typically cast
 * `grid.preset` to their concrete preset type inside the override.
 *
 * Cells with capacity > 1 emit one `itemAdded` / `itemRemoved` per push
 * or pop. The default cell/item visuals place every item at cell center,
 * so stack-using apps should subclass the visual classes to render
 * items at distinct stack positions.
 */
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
    this._subs.add(this._events!.onItemAdded((cell, item) => this.onItemAdded(cell, item)));
    this._subs.add(this._events!.onItemRemoved((cell, item) => this.onItemRemoved(cell, item)));
  }

  protected createItemObjectOption(item: IGridItem, grid: IBaseGrid): GridItemObjectOptions {
    return new GridItemObjectOptions(item.itemId, grid.preset);
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
    this._model = null;
    this._events = null;
  }

  private syncGridToView(grid: IBaseGrid, view: IGridView): void {
    view.addGrid({
      id: grid.gridId,
      position: grid.position,
      rotation: grid.rotation,
      preset: grid.preset,
    });
    for (let col = 0; col < grid.columnCount; col++) {
      for (let row = 0; row < grid.rowCount; row++) {
        const cell = grid.getCell(col, row);
        if (!cell) continue;
        for (const item of cell.items) {
          view.createItem(this.createItemObjectOption(item, grid), grid.gridId, col, row);
        }
      }
    }
  }

  private onGridAdded(grid: IBaseGrid): void {
    if (this._view) this.syncGridToView(grid, this._view);
  }

  private onItemAdded(cell: IGridCell, item: IGridItem): void {
    const grid = cell.grid;
    this._view?.createItem(this.createItemObjectOption(item, grid), grid.gridId, cell.col, cell.row);
  }

  private onItemRemoved(cell: IGridCell, item: IGridItem): void {
    const grid = cell.grid;
    this._view?.destroyItem(item.itemId, grid.gridId, cell.col, cell.row);
  }
}
