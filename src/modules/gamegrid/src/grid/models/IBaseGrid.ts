import type { IGridCell } from "./IGridCell.js";
import type { IGridPreset } from "./IGridPreset.js";
import type { Vector3 } from "./Vector3.js";

/**
 * Shape-agnostic readonly view of a grid model.
 *
 * Carries identity (`gridId`), local-space transform (`position`,
 * `rotation`), cell access (`getCell` / `getCellSafe`), and the full
 * `IGridPreset` surface (counts + cell-position math + neighbor
 * traversal).
 *
 * Concrete shape interfaces (`IRectGrid`, `IHexGrid`) narrow `preset`
 * to their concrete preset type. Generic algorithms that don't care
 * about shape (BFS, flood fill, tooling that catalogues grids) take
 * `IBaseGrid`.
 */
export interface IBaseGrid extends IGridPreset {
  readonly gridId: number;
  readonly position: Vector3;
  readonly rotation: Vector3;
  readonly preset: IGridPreset;
  getCell(col: number, row: number): IGridCell | null;
  getCellSafe(col: number, row: number): IGridCell | null;
}
