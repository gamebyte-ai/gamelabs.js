import type { Vector3 } from "../constants/Vector3.js";
import type { GridPreset } from "./GridPreset.js";
import type { IGridCell } from "./IGridCell.js";

export interface IGrid {
  readonly gridId: number;
  readonly columnCount: number;
  readonly rowCount: number;
  readonly preset: GridPreset;
  readonly position: Vector3;
  readonly rotation: Vector3;
  getCell(col: number, row: number): IGridCell | null;
  getCellSafe(col: number, row: number): IGridCell | null;
}
