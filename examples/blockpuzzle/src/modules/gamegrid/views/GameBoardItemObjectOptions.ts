import { GridItemObjectOptions, type RectGridPreset } from "@gamebyte/gamelabsjs";
import type { PieceType } from "../../../BlockPuzzleConfig";

/**
 * Carries the piece-specific data the view needs into the framework's
 * `GridItemObject` pipeline. The controller fills these in from the
 * model item + config (`pieceType` from the item, `color` from the
 * item, `blockSize` per-surface from config); the visual reads them
 * straight off the options without touching DI.
 */
export class GameBoardItemObjectOptions extends GridItemObjectOptions {
  public readonly pieceType: PieceType;
  /** Block colour for this spawn. Independent of `pieceType` — any
   *  piece can render in any colour from
   *  `BlockPuzzleConfig.blockColors`. */
  public readonly color: number;
  /** World-space size of one piece-block on the host grid. Differs
   *  per surface (tray uses a smaller value so long pieces fit). */
  public readonly blockSize: number;

  public constructor(itemId: number, gridPreset: RectGridPreset, pieceType: PieceType, color: number, blockSize: number) {
    super(itemId, gridPreset);
    this.pieceType = pieceType;
    this.color = color;
    this.blockSize = blockSize;
  }
}
