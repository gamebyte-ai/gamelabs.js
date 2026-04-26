import type { GridBounds } from "./GridBounds.js";
import type { GridCoord } from "./GridCoord.js";
import type { IGridPreset } from "./IGridPreset.js";
import type { Vector3 } from "./Vector3.js";

/**
 * Abstract base for grid presets.
 *
 * Carries the cell counts and direction count, plus shape-agnostic
 * implementations of {@link isValidCell}, {@link getOppositeDirection},
 * and {@link getAllNeighbors}. Concrete subclasses (`RectGridPreset`,
 * `HexGridPreset`) supply their layout configuration (cell sizes, axes
 * or `hexSize`) and shape-specific cell-position math, bounds, and the
 * per-direction neighbor delta.
 */
export abstract class BaseGridPreset implements IGridPreset {
  public abstract readonly columnCount: number;
  public abstract readonly rowCount: number;
  public abstract readonly directionCount: number;

  public abstract getCellPosition(col: number, row: number): Vector3;
  public abstract getBounds(): GridBounds;
  public abstract getCenterOffset(): Vector3;
  public abstract getNeighbor(col: number, row: number, direction: number): GridCoord | null;

  public isValidCell(col: number, row: number): boolean {
    return col >= 0 && col < this.columnCount && row >= 0 && row < this.rowCount;
  }

  public getOppositeDirection(direction: number): number {
    return (direction + this.directionCount / 2) % this.directionCount;
  }

  public getAllNeighbors(col: number, row: number): GridCoord[] {
    const out: GridCoord[] = [];
    for (let d = 0; d < this.directionCount; d++) {
      const n = this.getNeighbor(col, row, d);
      if (n) out.push(n);
    }
    return out;
  }
}
