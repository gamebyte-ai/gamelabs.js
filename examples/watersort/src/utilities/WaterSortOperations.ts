import { Bottle } from "../models/Bottle.js";
import { WaterSortConfig } from "../WaterSortConfig.js";

export class WaterSortOperations {
  private _bottles: Bottle[] = [];
  private _level = 0;
  private _moves = 0;
  private readonly _config: WaterSortConfig;

  constructor(config: WaterSortConfig) {
    this._config = config;
  }

  get bottles(): readonly Bottle[] {
    return this._bottles;
  }

  get level(): number {
    return this._level;
  }

  get moves(): number {
    return this._moves;
  }

  /** Generate a new puzzle for the given level. */
  public generateLevel(level: number): void {
    this._level = level;
    this._moves = 0;
    const cfg = this._config;
    const colorCount = Math.min(cfg.maxColorCount, cfg.startingColorCount + (level - 1) * cfg.colorCountIncrement);
    const capacity = cfg.segmentsPerBottle;
    const totalBottles = colorCount + cfg.emptyBottles;

    // Build a flat array of segments: `capacity` copies of each color
    const segments: number[] = [];
    for (let c = 0; c < colorCount; c++) {
      for (let s = 0; s < capacity; s++) {
        segments.push(c);
      }
    }

    // Shuffle (Fisher-Yates)
    for (let i = segments.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [segments[i], segments[j]] = [segments[j]!, segments[i]!];
    }

    // Fill bottles
    this._bottles = [];
    for (let b = 0; b < colorCount; b++) {
      const bottle = new Bottle(capacity);
      for (let s = 0; s < capacity; s++) {
        bottle.push(segments[b * capacity + s]!);
      }
      this._bottles.push(bottle);
    }

    // Add empty bottles
    for (let e = 0; e < cfg.emptyBottles; e++) {
      this._bottles.push(new Bottle(capacity));
    }
  }

  /** Check if pouring from `fromIdx` to `toIdx` is valid. */
  public canPour(fromIdx: number, toIdx: number): boolean {
    if (fromIdx === toIdx) return false;
    const from = this._bottles[fromIdx];
    const to = this._bottles[toIdx];
    if (!from || !to) return false;
    if (from.isEmpty) return false;
    if (to.isFull) return false;
    if (to.isEmpty) return true;
    return to.topColor === from.topColor;
  }

  /** Pour the top group from `fromIdx` to `toIdx`. Returns number of segments moved. */
  public pour(fromIdx: number, toIdx: number): number {
    if (!this.canPour(fromIdx, toIdx)) return 0;
    const from = this._bottles[fromIdx]!;
    const to = this._bottles[toIdx]!;
    const color = from.topColor!;
    let moved = 0;
    const maxMove = Math.min(from.topGroupCount, to.freeSpace);

    for (let i = 0; i < maxMove; i++) {
      to.push(from.pop());
      moved++;
    }

    this._moves += 1;
    return moved;
  }

  /** Check if the puzzle is solved. */
  public isSolved(): boolean {
    return this._bottles.every(b => b.isSorted || b.isEmpty);
  }
}
