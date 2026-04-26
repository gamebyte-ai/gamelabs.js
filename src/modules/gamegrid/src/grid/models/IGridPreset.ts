import type { GridBounds } from "./GridBounds.js";
import type { GridCoord } from "./GridCoord.js";
import type { Vector3 } from "./Vector3.js";

/**
 * Shape-agnostic readonly view of a grid's coordinate system, layout
 * configuration, and topology.
 *
 * Implemented by `RectGridPreset` and `HexGridPreset`. `IBaseGrid`
 * extends this so callers that only need cell-position math, neighbor
 * traversal, or counts can accept any grid shape.
 *
 * Direction-indexed neighbor access lets generic algorithms (BFS, flood
 * fill, future pathfinding) traverse any grid shape uniformly. The mapping
 * from direction index to geometric direction is implementation-defined;
 * see `RectDirection4` / `RectDirection8` / `HexDirection` enums.
 */
export interface IGridPreset {
  /** Number of columns. */
  readonly columnCount: number;
  /** Number of rows. */
  readonly rowCount: number;
  /**
   * Number of distinct neighbor directions for this geometry. Direction
   * indices passed to {@link getNeighbor} are in `[0, directionCount)`.
   * - Rect 4-way: 4. Rect 8-way: 8. Hex: 6.
   */
  readonly directionCount: number;

  /** True iff `(col, row)` is inside `[0, columnCount) × [0, rowCount)`. */
  isValidCell(col: number, row: number): boolean;

  /** Local-space center position of the cell at `(col, row)`. */
  getCellPosition(col: number, row: number): Vector3;

  /** Axis-aligned extents covered by the cell layout. */
  getBounds(): GridBounds;

  /** Local-space offset that recenters the cell layout around the origin. */
  getCenterOffset(): Vector3;

  /**
   * The neighbor of `(col, row)` in the given `direction`, or `null` if
   * the neighbor is out of bounds, the source cell is out of bounds, or
   * the direction index is out of range.
   */
  getNeighbor(col: number, row: number, direction: number): GridCoord | null;

  /**
   * The opposite direction index. For any regular shape with even
   * `directionCount`: `(direction + directionCount / 2) % directionCount`.
   */
  getOppositeDirection(direction: number): number;

  /** All in-bounds neighbors of `(col, row)`. */
  getAllNeighbors(col: number, row: number): GridCoord[];
}
