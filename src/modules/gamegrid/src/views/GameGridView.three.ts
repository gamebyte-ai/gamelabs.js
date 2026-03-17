import type { IInstanceResolver } from "../../../../core/di/IInstanceResolver.js";
import type { IInputManager } from "../../../../core/input/IInputManager.js";
import { WorldViewBase } from "../../../../core/views/WorldViewBase.js";
import type { IGameGridView, AddGridData } from "./IGameGridView.js";
import type { GameGridItem } from "../models/GameGridItem.js";
import { GameGridObject } from "./GameGridObject.js";
import { GameGridObjectCreator } from "./GameGridObjectCreator.js";
import { IGameGridObjectPointerListener } from "./IGameGridObjectPointerListener.js";
import { IInputManager as IInputManagerToken } from "../../../../core/input/IInputManager.js";

export class GameGridView extends WorldViewBase implements IGameGridView, IGameGridObjectPointerListener {
  private readonly _gridObjects = new Map<number, GameGridObject>();
  private _creator: GameGridObjectCreator | null = null;

  private get creator(): GameGridObjectCreator {
    if (!this._creator) throw new Error("GameGridView is not initialized");
    return this._creator;
  }

  public override inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._creator = resolver.getInstance(GameGridObjectCreator);
  }

  public addGrid(data: AddGridData): void {
    const gridObj = new GameGridObject(data, this.creator, this, this.inputManager);
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

  public updateCellItem(gridId: number, col: number, row: number, item: GameGridItem | null): void {
    const gridObj = this._gridObjects.get(gridId);
    if (!gridObj) return;
    gridObj.removeItemAt(col, row);
    if (item !== null) {
      const itemObj = this.creator.createItemObject(item.itemId, gridObj.preset, this, this.inputManager);
      gridObj.addItem(itemObj, col, row);
    }
  }
  
  public onGridPointerDown(gridId: number, event: PointerEvent): void {}
  
  public onGridPointerUp(gridId: number, event: PointerEvent): void {}
  
  public onGridCellPointerDown(gridId: number, col: number, row: number, event: PointerEvent): void {}
  
  public onGridCellPointerUp(gridId: number, col: number, row: number, event: PointerEvent): void {}
  
  public onGridItemPointerDown(itemId: number, event: PointerEvent): void {}
  
  public onGridItemPointerUp(itemId: number, event: PointerEvent): void {}

  public preDestroy(): void {
    this._gridObjects.clear();
  }
}
