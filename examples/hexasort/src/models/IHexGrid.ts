import { InjectionToken } from "@gamebyte/gamelabsjs";
import type { HexCellPosition, HexGridBounds } from "../constants/HexGridTypes.js";

/**
 * Readonly view of the hex grid model. Controllers and views receive this
 * interface; the concrete {@link HexGrid} (with mutating methods) is held
 * only by utilities that own state (e.g. `GameOperations`, `SortingManager`).
 */
export interface IHexGrid {
  readonly gridId: number;
  readonly columnCount: number;
  readonly rowCount: number;
  readonly hexSize: number;
  isValidCell(col: number, row: number): boolean;
  isEmpty(col: number, row: number): boolean;
  getColors(col: number, row: number): readonly number[] | null;
  getHeight(col: number, row: number): number;
  getTopColor(col: number, row: number): number | null;
  getDistinctColorCount(col: number, row: number): number;
  getCellPosition(col: number, row: number): HexCellPosition;
  getBounds(): HexGridBounds;
  getCenterOffset(): HexCellPosition;
}

export const IHexGrid = new InjectionToken<IHexGrid>("IHexGrid");
