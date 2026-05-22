import { vector } from "@js-basics/vector";
import { RectGridPreset, type Vector3 } from "@gamebyte/gamelabsjs";
import type { BlockPuzzleConfig } from "../BlockPuzzleConfig";

export interface BoardLayout {
  /** Local-space position to set on the playing grid so it sits
   *  centered horizontally and lifted above origin by half the
   *  combined grid + spacing + tray height. */
  readonly gridPosition: Vector3;
  /** Local-space position to set on the tray grid so it sits centered
   *  horizontally and dropped below origin by the symmetric amount. */
  readonly trayPosition: Vector3;
  /** Axis-aligned span of the combined grid + spacing + tray block.
   *  The camera fit reads these to pick an ortho size that always
   *  leaves `boardMargin` free on every side regardless of aspect. */
  readonly contentWidth: number;
  readonly contentHeight: number;
}

/**
 * Resolves world-space placement for the playing grid and the piece
 * tray from the config alone.
 *
 * Both surfaces are modeled as `RectGrid`s; the playing grid's preset
 * uses `gridCellSize`, the tray's uses `traySlotSize`. Each preset's
 * `getCenterOffset()` says how far cell (0, 0) sits from the grid's
 * own midpoint, so we cancel that on the grid's position and then
 * stack the two surfaces vertically along Z with `gridToTraySpacing`
 * between them, centered on the origin (the camera follows origin).
 */
export class BoardLayoutCalculator {
  public static compute(config: BlockPuzzleConfig): BoardLayout {
    const gridPreset = BoardLayoutCalculator.makeGridPreset(config);
    const trayPreset = BoardLayoutCalculator.makeTrayPreset(config);

    const gridBounds = gridPreset.getBounds();
    const trayBounds = trayPreset.getBounds();

    const totalDepth = gridBounds.depth + config.gridToTraySpacing + trayBounds.depth;

    // Z- side holds the grid (top of screen in a top-down 2d cam);
    // Z+ side holds the tray (bottom of screen).
    const gridCenterZ = -(totalDepth / 2) + gridBounds.depth / 2;
    const trayCenterZ = totalDepth / 2 - trayBounds.depth / 2;

    const gridOffset = gridPreset.getCenterOffset();
    const trayOffset = trayPreset.getCenterOffset();

    return {
      gridPosition: vector(-gridOffset.x, -gridOffset.y, -gridOffset.z + gridCenterZ),
      trayPosition: vector(-trayOffset.x, -trayOffset.y, -trayOffset.z + trayCenterZ),
      contentWidth: Math.max(gridBounds.width, trayBounds.width),
      contentHeight: totalDepth,
    };
  }

  public static makeGridPreset(config: BlockPuzzleConfig): RectGridPreset {
    return new RectGridPreset({
      columnCount: config.gridColumns,
      rowCount: config.gridRows,
      columnSize: config.gridCellSize,
      rowSize: config.gridCellSize,
    });
  }

  public static makeTrayPreset(config: BlockPuzzleConfig): RectGridPreset {
    return new RectGridPreset({
      columnCount: config.traySlots,
      rowCount: 1,
      columnSize: config.traySlotSize,
      rowSize: config.traySlotSize,
    });
  }
}
