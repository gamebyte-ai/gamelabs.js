import { WorldViewBase } from "../../../../core/views/WorldViewBase.js";
import type { IGameGridView, AddGridData } from "./IGameGridView.js";
import type { GameGridItem } from "../models/GameGridItem.js";
import { GameGridObject } from "./GameGridObject.js";
import { GameGridObjectCreator } from "./GameGridObjectCreator.js";

export class GameGridView extends WorldViewBase implements IGameGridView {
  private readonly _gridObjects = new Map<number, GameGridObject>();
  private readonly _creator = new GameGridObjectCreator();

  public addGrid(data: AddGridData): void {
    const gridObj = new GameGridObject(data, this._creator);
    this._gridObjects.set(data.id, gridObj);
    this.add(gridObj);
  }

  public removeGrid(gridId: number): void {
    const gridObj = this._gridObjects.get(gridId);
    if (!gridObj) return;
    this._gridObjects.delete(gridId);
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

  public updateCellItem(gridId: number, col: number, row: number, item: GameGridItem | null): void {
    const gridObj = this._gridObjects.get(gridId);
    if (!gridObj) return;
    gridObj.removeItemAt(col, row);
    if (item !== null) {
      const itemObj = this._creator.createItemObject(item.itemId, gridObj.preset);
      gridObj.addItem(itemObj, col, row);
    }
  }

  public preDestroy(): void {
    this._gridObjects.clear();
  }
}
