import type { IInstanceResolver } from "../../../../core/di/IInstanceResolver.js";
import { WorldViewBase } from "../../../../core/world/WorldViewBase.js";
import type { IGridView, AddGridData } from "./IGridView.js";
import type { GridItemObjectOptions } from "./GridItemObject.js";
import { GridObject } from "./GridObject.js";
import { GridObjectCreator } from "./GridObjectCreator.js";
import type { IGridObjectListener } from "./IGridObjectListener.js";

export class GridsView extends WorldViewBase implements IGridView, IGridObjectListener {
  private readonly _gridObjects = new Map<number, GridObject>();
  private _creator: GridObjectCreator | null = null;

  private get creator(): GridObjectCreator {
    if (!this._creator) throw new Error("GridsView is not initialized");
    return this._creator;
  }

  public override inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._creator = resolver.getInstance(GridObjectCreator);
  }

  public addGrid(data: AddGridData): void {
    const gridObj = new GridObject(data, this.creator, this, this.inputManager, this.assetLoader);
    this._gridObjects.set(data.id, gridObj);
    this.add(gridObj);
  }

  public removeGrid(gridId: number): void {
    const gridObj = this._gridObjects.get(gridId);
    if (!gridObj) return;
    this._gridObjects.delete(gridId);
    gridObj.unregisterFromInputManager();
    gridObj.removeFromParent();
  }

  public updateGridPosition(gridId: number, position: { x: number; y: number; z: number }): void {
    const gridObj = this._gridObjects.get(gridId);
    if (gridObj) gridObj.position.set(position.x, position.y, position.z);
  }

  public updateGridRotation(gridId: number, rotation: { x: number; y: number; z: number }): void {
    const gridObj = this._gridObjects.get(gridId);
    if (gridObj) gridObj.rotation.set(rotation.x, rotation.y, rotation.z);
  }

  public createItem(itemOptions: GridItemObjectOptions, gridId: number, col: number, row: number): void {
    const gridObj = this._gridObjects.get(gridId);
    if (!gridObj) return;
    const itemObj = this.creator.createItemObject(itemOptions, this, this.inputManager, this.assetLoader);
    gridObj.addItem(itemObj, col, row);
  }

  public moveItem(
    itemId: number,
    gridId: number,
    col: number,
    row: number,
    toGridId: number,
    toCol: number,
    toRow: number,
  ): void {
    const gridObj = this._gridObjects.get(gridId);
    const toGridObj = this._gridObjects.get(toGridId);
    if (!gridObj || !toGridObj) return;
    const itemObj = gridObj.takeItemAt(col, row);
    if (!itemObj || itemObj.itemId !== itemId) return;
    toGridObj.addItem(itemObj, toCol, toRow);
  }

  public destroyItem(itemId: number, gridId: number, col: number, row: number): void {
    const gridObj = this._gridObjects.get(gridId);
    if (!gridObj) return;
    const cell = gridObj.getCell(col, row);
    if (!cell?.item || cell.item.itemId !== itemId) return;
    gridObj.removeItemAt(col, row);
  }

  public getGridObject(gridId: number): GridObject | undefined {
    return this._gridObjects.get(gridId);
  }

  public onGridPointerDown(_gridId: number, _event: PointerEvent): void {}

  public onGridPointerUp(_gridId: number, _event: PointerEvent): void {}

  public onGridCellPointerDown(_gridId: number, _col: number, _row: number, _event: PointerEvent): void {}

  public onGridCellPointerUp(_gridId: number, _col: number, _row: number, _event: PointerEvent): void {}

  public onGridItemPointerDown(_itemId: number, _event: PointerEvent): void {}

  public onGridItemPointerUp(_itemId: number, _event: PointerEvent): void {}

  public preDestroy(): void {
    this._gridObjects.clear();
  }
}
