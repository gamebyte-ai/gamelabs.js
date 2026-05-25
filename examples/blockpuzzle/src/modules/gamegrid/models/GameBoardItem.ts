import { GridItem } from "@gamebyte/gamelabsjs";
import type { PieceType } from "../../../BlockPuzzleConfig";

/**
 * Per-board item model: one `GridItem` per piece, carrying a direct
 * reference to its {@link PieceType} entry from the catalog and the
 * spawn-assigned block colour.
 *
 * Colour is decoupled from the piece type — every piece type can
 * appear in any colour from {@link BlockPuzzleConfig.blockColors}.
 * The spawner picks the colour per spawn (currently: K distinct
 * colours for the K initial tray pieces) and writes it onto the
 * item; the visual reads it back via the item options.
 */
export class GameBoardItem extends GridItem {
  public readonly pieceType: PieceType;
  public readonly color: number;

  public constructor(itemId: number, pieceType: PieceType, color: number) {
    super(itemId);
    this.pieceType = pieceType;
    this.color = color;
  }
}
