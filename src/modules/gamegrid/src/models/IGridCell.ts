import type { IGrid } from "./IGrid.js";
import type { IGridItem } from "./IGridItem.js";

export interface IGridCell {
  readonly grid: IGrid;
  readonly col: number;
  readonly row: number;
  readonly item: IGridItem | null;
}
