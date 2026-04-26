import type { IGridCell } from "./IGridCell.js";

export interface IGridItem {
  readonly itemId: number;
  readonly cell: IGridCell | null;
}
