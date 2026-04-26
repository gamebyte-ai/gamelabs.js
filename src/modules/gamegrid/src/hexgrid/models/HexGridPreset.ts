import { vector } from "@js-basics/vector";
import { BaseGridPreset } from "../../grid/models/BaseGridPreset.js";
import type { GridBounds } from "../../grid/models/GridBounds.js";
import type { GridCoord } from "../../grid/models/GridCoord.js";
import type { Vector3 } from "../../grid/models/Vector3.js";

/**
 * Options for constructing a {@link HexGridPreset}.
 */
export type HexGridPresetOptions = {
  /** Number of columns. */
  readonly columnCount: number;
  /** Number of rows. */
  readonly rowCount: number;
  /** Hex circumradius (corner distance from cell center). @default 1 */
  readonly hexSize?: number;
};

// Neighbor deltas in odd-q flat-top offset coordinates, ordered to match
// HexDirection: UP, UP_RIGHT, DOWN_RIGHT, DOWN, DOWN_LEFT, UP_LEFT.
//
// In odd-q layout, columns alternate vertical offset: odd columns are
// shifted +0.5 row downward. As a result, the row delta for the diagonal
// neighbors of cell (col, row) depends on whether `col` is even or odd:
// - even col: UP_RIGHT/UP_LEFT step to row-1; DOWN_RIGHT/DOWN_LEFT stay at row.
// - odd col:  UP_RIGHT/UP_LEFT stay at row;    DOWN_RIGHT/DOWN_LEFT step to row+1.
//
// Opposite direction = (i + 3) % 6 for both tables.
const DELTAS_EVEN_COL: ReadonlyArray<readonly [number, number]> = [
  [0, -1], // UP
  [+1, -1], // UP_RIGHT
  [+1, 0], // DOWN_RIGHT
  [0, +1], // DOWN
  [-1, 0], // DOWN_LEFT
  [-1, -1], // UP_LEFT
];

const DELTAS_ODD_COL: ReadonlyArray<readonly [number, number]> = [
  [0, -1], // UP
  [+1, 0], // UP_RIGHT
  [+1, +1], // DOWN_RIGHT
  [0, +1], // DOWN
  [-1, +1], // DOWN_LEFT
  [-1, 0], // UP_LEFT
];

/**
 * Hexagonal grid preset: flat-top hexes laid out in odd-q offset
 * coordinates, with `hexSize` controlling the circumradius (and thus
 * cell visual scale).
 *
 * - Cells are addressed by `(col, row)` in `[0, columnCount) × [0, rowCount)`.
 * - Odd columns are shifted +0.5 row along the row axis (Z).
 * - Adjacent cells meet edge-to-edge: center-to-center distance is
 *   `√3 · hexSize` (= `2 · apothem`) for vertical neighbors and
 *   `1.5 · hexSize` (horizontal step) for diagonal neighbors.
 *
 * Neighbor topology has 6 directions; opposite direction is `(i + 3) % 6`.
 */
export class HexGridPreset extends BaseGridPreset {
  public readonly columnCount: number;
  public readonly rowCount: number;
  public readonly hexSize: number;
  public readonly directionCount = 6;

  public constructor(opts: HexGridPresetOptions) {
    super();
    this.columnCount = opts.columnCount;
    this.rowCount = opts.rowCount;
    this.hexSize = opts.hexSize ?? 1;
  }

  public override getCellPosition(col: number, row: number): Vector3 {
    const x = this.hexSize * 1.5 * col;
    const oddOffset = (col & 1) === 0 ? 0 : 0.5;
    const z = this.hexSize * Math.sqrt(3) * (row + oddOffset);
    return vector(x, 0, z);
  }

  public override getBounds(): GridBounds {
    const width = this.hexSize * (1.5 * Math.max(0, this.columnCount - 1) + 2);
    const stagger = this.columnCount > 1 ? 0.5 : 0;
    const depth = this.hexSize * Math.sqrt(3) * (this.rowCount + stagger);
    return { width, depth };
  }

  public override getCenterOffset(): Vector3 {
    const offsetX = this.hexSize * 1.5 * Math.max(0, this.columnCount - 1) * 0.5;
    const stagger = this.columnCount > 1 ? 0.5 : 0;
    const offsetZ = this.hexSize * Math.sqrt(3) * (this.rowCount - 1 + stagger) * 0.5;
    return vector(offsetX, 0, offsetZ);
  }

  public override getNeighbor(col: number, row: number, direction: number): GridCoord | null {
    if (direction < 0 || direction >= this.directionCount) return null;
    if (!this.isValidCell(col, row)) return null;
    const deltas = (col & 1) === 0 ? DELTAS_EVEN_COL : DELTAS_ODD_COL;
    const [dc, dr] = deltas[direction]!;
    const nc = col + dc;
    const nr = row + dr;
    return this.isValidCell(nc, nr) ? { col: nc, row: nr } : null;
  }
}
