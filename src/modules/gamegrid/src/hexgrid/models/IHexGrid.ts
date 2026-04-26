import type { IBaseGrid } from "../../grid/models/IBaseGrid.js";
import type { HexGridPreset } from "./HexGridPreset.js";

/**
 * Readonly view of a hexagonal grid.
 *
 * Narrows {@link IBaseGrid.preset} to {@link HexGridPreset} so callers
 * can read `hexSize` without casting. Apps that only need shape-agnostic
 * features (cell access, neighbor traversal, counts) can accept
 * `IBaseGrid`.
 */
export interface IHexGrid extends IBaseGrid {
  readonly preset: HexGridPreset;
}
