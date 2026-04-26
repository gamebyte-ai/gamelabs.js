import type { IBaseGrid } from "./IBaseGrid.js";
import type { IGridItem } from "./IGridItem.js";

export interface IGridCell {
  readonly grid: IBaseGrid;
  readonly col: number;
  readonly row: number;
  readonly capacity: number;
  readonly size: number;
  readonly items: readonly IGridItem[];
  /** Top of the stack, or null when empty. Equivalent to `items[size - 1] ?? null`. */
  readonly item: IGridItem | null;
}
