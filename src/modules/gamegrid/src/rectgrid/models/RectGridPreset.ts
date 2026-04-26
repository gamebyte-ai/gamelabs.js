import { vector } from "@js-basics/vector";
import { BaseGridPreset } from "../../grid/models/BaseGridPreset.js";
import type { GridBounds } from "../../grid/models/GridBounds.js";
import type { GridCoord } from "../../grid/models/GridCoord.js";
import type { Vector3 } from "../../grid/models/Vector3.js";

/**
 * Options for constructing a {@link RectGridPreset}.
 */
export type RectGridPresetOptions = {
  /** Number of columns. */
  readonly columnCount: number;
  /** Number of rows. */
  readonly rowCount: number;
  /** Cell size along the column axis. @default 1 */
  readonly columnSize?: number;
  /** Cell size along the row axis. @default 1 */
  readonly rowSize?: number;
  /** Local-space direction columns advance along. @default (1, 0, 0) */
  readonly columnAxis?: Vector3;
  /** Local-space direction rows advance along. @default (0, 0, 1) */
  readonly rowAxis?: Vector3;
  /**
   * Include diagonal directions in the neighbor topology. When `false`,
   * `directionCount` is 4 and the {@link RectDirection4} enum applies.
   * When `true`, `directionCount` is 8 and {@link RectDirection8} applies.
   * @default false
   */
  readonly useDiagonals?: boolean;
};

// 4-way deltas, ordered to match RectDirection4: RIGHT, DOWN, LEFT, UP.
// Opposite direction = (i + 2) % 4.
const DELTAS_4: ReadonlyArray<readonly [number, number]> = [
  [+1, 0],
  [0, +1],
  [-1, 0],
  [0, -1],
];

// 8-way deltas, ordered to match RectDirection8: RIGHT, RIGHT_DOWN, DOWN,
// LEFT_DOWN, LEFT, LEFT_UP, UP, RIGHT_UP.
// Opposite direction = (i + 4) % 8.
const DELTAS_8: ReadonlyArray<readonly [number, number]> = [
  [+1, 0],
  [+1, +1],
  [0, +1],
  [-1, +1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [+1, -1],
];

/**
 * Rectangular grid preset: cell counts, layout configuration (cell
 * sizes and column/row axes), neighbor topology, and the math that
 * converts `(col, row)` to local-space positions.
 *
 * - `columnAxis` and `rowAxis` may be any local-space directions, so this
 *   can model XZ-plane boards (default), XY (front-facing), or rotated grids.
 * - `useDiagonals` switches between 4- and 8-way neighbor topology.
 */
export class RectGridPreset extends BaseGridPreset {
  public readonly columnCount: number;
  public readonly rowCount: number;
  public readonly columnSize: number;
  public readonly rowSize: number;
  public readonly columnAxis: Vector3;
  public readonly rowAxis: Vector3;
  public readonly useDiagonals: boolean;
  public readonly directionCount: number;

  private readonly _deltas: ReadonlyArray<readonly [number, number]>;

  public constructor(opts: RectGridPresetOptions) {
    super();
    this.columnCount = opts.columnCount;
    this.rowCount = opts.rowCount;
    this.columnSize = opts.columnSize ?? 1;
    this.rowSize = opts.rowSize ?? 1;
    this.columnAxis = opts.columnAxis ?? vector(1, 0, 0);
    this.rowAxis = opts.rowAxis ?? vector(0, 0, 1);
    this.useDiagonals = opts.useDiagonals ?? false;
    this.directionCount = this.useDiagonals ? 8 : 4;
    this._deltas = this.useDiagonals ? DELTAS_8 : DELTAS_4;
  }

  public override getCellPosition(col: number, row: number): Vector3 {
    const cw = this.columnSize;
    const cd = this.rowSize;
    return vector(
      col * cw * this.columnAxis.x + row * cd * this.rowAxis.x,
      col * cw * this.columnAxis.y + row * cd * this.rowAxis.y,
      col * cw * this.columnAxis.z + row * cd * this.rowAxis.z,
    );
  }

  public override getBounds(): GridBounds {
    return {
      width: this.columnSize * this.columnCount,
      depth: this.rowSize * this.rowCount,
    };
  }

  public override getCenterOffset(): Vector3 {
    const offsetCol = this.columnSize * Math.max(0, this.columnCount - 1) * 0.5;
    const offsetRow = this.rowSize * Math.max(0, this.rowCount - 1) * 0.5;
    return vector(
      offsetCol * this.columnAxis.x + offsetRow * this.rowAxis.x,
      offsetCol * this.columnAxis.y + offsetRow * this.rowAxis.y,
      offsetCol * this.columnAxis.z + offsetRow * this.rowAxis.z,
    );
  }

  public override getNeighbor(col: number, row: number, direction: number): GridCoord | null {
    if (direction < 0 || direction >= this.directionCount) return null;
    if (!this.isValidCell(col, row)) return null;
    const [dc, dr] = this._deltas[direction]!;
    const nc = col + dc;
    const nr = row + dr;
    return this.isValidCell(nc, nr) ? { col: nc, row: nr } : null;
  }
}
