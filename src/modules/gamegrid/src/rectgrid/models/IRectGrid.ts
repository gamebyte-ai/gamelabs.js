import type { IBaseGrid } from "../../grid/models/IBaseGrid.js";
import type { RectGridPreset } from "./RectGridPreset.js";

/**
 * Readonly view of a rectangular grid.
 *
 * Narrows {@link IBaseGrid.preset} to {@link RectGridPreset} so callers
 * can read rect-specific layout (`columnSize`, `rowSize`, axes) without
 * casting. Apps that only need shape-agnostic features (cell access,
 * neighbor traversal, counts) can accept `IBaseGrid`.
 */
export interface IRectGrid extends IBaseGrid {
  readonly preset: RectGridPreset;
}
