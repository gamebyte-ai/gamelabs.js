import { vector } from "@js-basics/vector";
import type { Vector3 } from "../types/Vector3.js";

export class GameGridPreset {
  public static readonly DEFAULT = new GameGridPreset();
  public readonly columnSize: number;
  public readonly rowSize: number;
  public readonly columnAxis: Vector3;
  public readonly rowAxis: Vector3;

  public constructor(columnSize: number = 1, rowSize: number = 1, columnAxis: Vector3 = vector(1, 0, 0), rowAxis: Vector3 = vector(0, 0, 1)) {
    this.columnSize = columnSize;
    this.rowSize = rowSize;
    this.columnAxis = columnAxis;
    this.rowAxis = rowAxis;
  }

  public getCellPosition(col: number, row: number): Vector3 {
    const cx = col * this.columnSize * this.columnAxis.x + row * this.rowSize * this.rowAxis.x;
    const cy = col * this.columnSize * this.columnAxis.y + row * this.rowSize * this.rowAxis.y;
    const cz = col * this.columnSize * this.columnAxis.z + row * this.rowSize * this.rowAxis.z;
    return vector(cx, cy, cz);
  }
}
