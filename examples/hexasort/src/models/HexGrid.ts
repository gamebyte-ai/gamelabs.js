import type { HexCellPosition, HexGridBounds } from "../constants/HexGridTypes.js";
import type { BlockStack } from "./BlockStack.js";
import type { IHexGrid } from "./IHexGrid.js";

export type { HexCellPosition, HexGridBounds } from "../constants/HexGridTypes.js";

/**
 * Flat-top hex grid model with odd-q offset coordinates and per-cell
 * block stacks.
 *
 * - Cells are addressed by `(col, row)` in `[0, columnCount) × [0, rowCount)`.
 * - Odd columns are shifted +0.5 row along the row axis (Z).
 * - Coordinate math places adjacent cells edge-to-edge at `hexSize` radius:
 *   center-to-center distance = `√3 · hexSize` = `2 · apothem`.
 * - Each cell stores a mutable array of color indices (bottom → top) so the
 *   sorting system can pop/push one block at a time. `null` means empty.
 *
 * Pure data + math: no rendering dependency. Scales to any `(cols, rows)`.
 *
 * The readonly API lives on {@link IHexGrid}. Controllers and views
 * receive the readonly interface; only `GameOperations` and the
 * `SortingManager` utility hold the concrete mutable class.
 */
export class HexGrid implements IHexGrid {
  public readonly gridId: number;
  public readonly columnCount: number;
  public readonly rowCount: number;
  public readonly hexSize: number;
  private readonly _cells: (number[] | null)[][];

  public constructor(gridId: number, columnCount: number, rowCount: number, hexSize: number) {
    this.gridId = gridId;
    this.columnCount = columnCount;
    this.rowCount = rowCount;
    this.hexSize = hexSize;
    this._cells = [];
    for (let col = 0; col < columnCount; col++) {
      const column: (number[] | null)[] = [];
      for (let row = 0; row < rowCount; row++) column.push(null);
      this._cells.push(column);
    }
  }

  public isValidCell(col: number, row: number): boolean {
    return col >= 0 && col < this.columnCount && row >= 0 && row < this.rowCount;
  }

  public isEmpty(col: number, row: number): boolean {
    if (!this.isValidCell(col, row)) return false;
    const colors = this._cells[col]![row];
    return colors === null || colors.length === 0;
  }

  public getColors(col: number, row: number): readonly number[] | null {
    if (!this.isValidCell(col, row)) return null;
    return this._cells[col]![row];
  }

  public getHeight(col: number, row: number): number {
    if (!this.isValidCell(col, row)) return 0;
    return this._cells[col]![row]?.length ?? 0;
  }

  public getTopColor(col: number, row: number): number | null {
    if (!this.isValidCell(col, row)) return null;
    const colors = this._cells[col]![row];
    if (!colors || colors.length === 0) return null;
    return colors[colors.length - 1]!;
  }

  public getDistinctColorCount(col: number, row: number): number {
    if (!this.isValidCell(col, row)) return 0;
    const colors = this._cells[col]![row];
    if (!colors || colors.length === 0) return 0;
    const seen = new Set<number>();
    for (const c of colors) seen.add(c);
    return seen.size;
  }

  public placeStack(col: number, row: number, stack: BlockStack): void {
    if (!this.isValidCell(col, row)) throw new Error(`Invalid cell (${col}, ${row})`);
    // Copy so subsequent mutations (pop/push) don't touch the caller's array.
    this._cells[col]![row] = [...stack.colors];
  }

  public popTop(col: number, row: number): number | null {
    if (!this.isValidCell(col, row)) return null;
    const colors = this._cells[col]![row];
    if (!colors || colors.length === 0) return null;
    const popped = colors.pop()!;
    if (colors.length === 0) this._cells[col]![row] = null;
    return popped;
  }

  public pushTop(col: number, row: number, color: number): void {
    if (!this.isValidCell(col, row)) throw new Error(`Invalid cell (${col}, ${row})`);
    let colors = this._cells[col]![row];
    if (colors === null) {
      colors = [];
      this._cells[col]![row] = colors;
    }
    colors.push(color);
  }

  /** Local-space center of the cell at `(col, row)` on the XZ plane. */
  public getCellPosition(col: number, row: number): HexCellPosition {
    const x = this.hexSize * 1.5 * col;
    const oddOffset = (col & 1) === 0 ? 0 : 0.5;
    const z = this.hexSize * Math.sqrt(3) * (row + oddOffset);
    return { x, y: 0, z };
  }

  /** Axis-aligned XZ extents covered by the cell layout (used for centering). */
  public getBounds(): HexGridBounds {
    const width = this.hexSize * (1.5 * Math.max(0, this.columnCount - 1) + 2);
    const stagger = this.columnCount > 1 ? 0.5 : 0;
    const depth = this.hexSize * Math.sqrt(3) * (this.rowCount + stagger);
    return { width, depth };
  }

  /** XZ offset that recenters the cell layout around the local origin. */
  public getCenterOffset(): HexCellPosition {
    const offsetX = this.hexSize * 1.5 * Math.max(0, this.columnCount - 1) * 0.5;
    const stagger = this.columnCount > 1 ? 0.5 : 0;
    const offsetZ = this.hexSize * Math.sqrt(3) * (this.rowCount - 1 + stagger) * 0.5;
    return { x: offsetX, y: 0, z: offsetZ };
  }
}
