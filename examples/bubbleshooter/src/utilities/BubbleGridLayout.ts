import { BubbleShooterConfig } from "../BubbleShooterConfig";

export interface IBubbleGridCellPosition {
  readonly x: number;
  readonly y: number;
}

export interface IBubbleGridNeighborOffset {
  readonly dRow: number;
  readonly dCol: number;
}

/**
 * Pure layout math for a classic Bubble Shooter offset-row grid.
 *
 * Even-indexed rows ("wide") hold {@link BubbleShooterConfig.wideRowColumns}
 * cells flush to the left wall. Odd-indexed rows ("narrow") hold one cell
 * fewer and are shifted right by a bubble radius so neighbouring bubbles
 * touch. Vertical pitch is `r * sqrt(3)` for tight packing.
 *
 * Coordinates returned by {@link getCellLocalPosition} are relative to the
 * grid's top-left corner with `+x` right and `+y` down. Callers are free to
 * map this into whatever world frame they use (e.g. flip `y` for Three.js).
 */
export class BubbleGridLayout {
  private readonly _config: BubbleShooterConfig;

  public constructor(config: BubbleShooterConfig) {
    this._config = config;
  }

  public get bubbleRadius(): number {
    return this._config.bubbleRadius;
  }

  public get rowCount(): number {
    return this._config.rowCount;
  }

  public get rowPitch(): number {
    return this._config.bubbleRadius * Math.sqrt(3);
  }

  public get gridWidth(): number {
    return this._config.wideRowColumns * this._config.bubbleRadius * 2;
  }

  public get gridHeight(): number {
    const r = this._config.bubbleRadius;
    return r * 2 + (this._config.rowCount - 1) * this.rowPitch;
  }

  public isWideRow(row: number): boolean {
    return row % 2 === 0;
  }

  public getColumnCount(row: number): number {
    return this.isWideRow(row) ? this._config.wideRowColumns : this._config.wideRowColumns - 1;
  }

  public getCellLocalPosition(row: number, col: number): IBubbleGridCellPosition {
    const r = this._config.bubbleRadius;
    const xOffset = this.isWideRow(row) ? r : 2 * r;
    return { x: xOffset + col * 2 * r, y: r + row * this.rowPitch };
  }

  /**
   * Six neighbour offsets in offset coordinates. The set depends on whether
   * `row` is wide or narrow because the row above/below is shifted relative
   * to it. The order is: left, right, upper-left, upper-right, lower-left,
   * lower-right.
   */
  public getNeighborOffsets(row: number): readonly IBubbleGridNeighborOffset[] {
    if (this.isWideRow(row)) {
      return [
        { dRow: 0, dCol: -1 },
        { dRow: 0, dCol: +1 },
        { dRow: -1, dCol: -1 },
        { dRow: -1, dCol: 0 },
        { dRow: +1, dCol: -1 },
        { dRow: +1, dCol: 0 },
      ];
    }
    return [
      { dRow: 0, dCol: -1 },
      { dRow: 0, dCol: +1 },
      { dRow: -1, dCol: 0 },
      { dRow: -1, dCol: +1 },
      { dRow: +1, dCol: 0 },
      { dRow: +1, dCol: +1 },
    ];
  }

  public isInBounds(row: number, col: number): boolean {
    if (row < 0 || row >= this._config.rowCount) return false;
    if (col < 0 || col >= this.getColumnCount(row)) return false;
    return true;
  }
}
