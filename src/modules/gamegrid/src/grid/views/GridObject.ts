import type { AddGridData } from "./IGridView.js";
import type { IAssetManager } from "../../../../../core/assets/IAssetManager.js";
import type { BaseGridPreset } from "../models/BaseGridPreset.js";
import type { GridObjectCreator } from "./GridObjectCreator.js";
import type { GridItemObject } from "./GridItemObject.js";
import { GridCellObjectOptions } from "./GridCellObject.js";
import type { GridCellObject } from "./GridCellObject.js";
import type { IGridObjectListener } from "./IGridObjectListener.js";
import type { IInputManager } from "../../../../../core/input/IInputManager.js";
import type { IPointerInputHandler } from "../../../../../core/input/IPointerInputHandler.js";
import { WorldInteractiveObject } from "../../../../../core/world/WorldInteractiveObject.three.js";

export class GridObject extends WorldInteractiveObject {
  public readonly gridId: number;
  public readonly columnCount: number;
  public readonly rowCount: number;
  public readonly preset: BaseGridPreset;
  private readonly _creator: GridObjectCreator;
  private readonly _pointerListener: IGridObjectListener;
  private readonly _cells: GridCellObject[][];

  public constructor(
    data: AddGridData,
    creator: GridObjectCreator,
    pointerListener: IGridObjectListener,
    inputManager: IInputManager | null,
    assetManager?: IAssetManager | null,
  ) {
    super();
    this.gridId = data.id;
    this.preset = data.preset;
    this.columnCount = data.preset.columnCount;
    this.rowCount = data.preset.rowCount;
    this.position.set(data.position.x, data.position.y, data.position.z);
    this.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
    this._creator = creator;
    this._pointerListener = pointerListener;
    this.setInputManager(inputManager);
    this._cells = [] as GridCellObject[][];

    for (let col = 0; col < this.columnCount; col++) {
      const colArr: GridCellObject[] = [];
      for (let row = 0; row < this.rowCount; row++) {
        const pos = this.preset.getCellPosition(col, row);
        const cell = this._creator.createCellObject(
          new GridCellObjectOptions(this.gridId, col, row, pos, this.preset),
          this._pointerListener,
          this.inputManager,
          assetManager,
        );
        colArr.push(cell);
        this.add(cell);
      }
      this._cells.push(colArr);
    }
    this.createCollider();
  }

  public addItem(item: GridItemObject, col: number, row: number): void {
    const cell = this._cells[col]?.[row];
    if (cell) {
      cell.setItem(item);
      item.setCell(cell);
    } else {
      throw new Error(`Cell not found at column ${col} and row ${row}`);
    }
  }

  public removeItem(item: GridItemObject, col: number, row: number): void {
    const cell = this._cells[col]?.[row];
    if (cell) {
      cell.removeItem();
      item.removeFromParent();
    } else {
      throw new Error(`Cell not found at column ${col} and row ${row}`);
    }
  }

  public getCell(col: number, row: number): GridCellObject | undefined {
    return this._cells[col]?.[row];
  }

  public removeItemAt(col: number, row: number): void {
    this.getCell(col, row)?.removeItem();
  }

  public takeItemAt(col: number, row: number): GridItemObject | null {
    return this.getCell(col, row)?.takeItem() ?? null;
  }

  public unregisterFromInputManager(): void {
    if (!this.inputManager) return;
    for (const colArr of this._cells) {
      for (const cell of colArr) {
        if (cell.isPointerInputHandler) this.inputManager.removePointerHandler(cell as unknown as IPointerInputHandler);
      }
    }
  }

  protected createCollider(): void {}
}
