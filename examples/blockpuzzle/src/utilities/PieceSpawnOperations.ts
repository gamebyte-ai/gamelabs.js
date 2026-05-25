import type { RectGrid } from "@gamebyte/gamelabsjs";
import type { PieceType } from "../BlockPuzzleConfig";
import { GameBoardItem } from "../modules/gamegrid/models/GameBoardItem";
import { ItemIdGenerator } from "./ItemIdGenerator";

/**
 * Piece-spawn operations on top of the framework's grid model.
 *
 * Used twice in the player's flow:
 * - **Initial deal** (game start): all three slots are empty, one
 *   piece dropped into each.
 * - **Refill** (after the player empties the tray): same operation,
 *   precondition is the same (every slot empty). The deal picks
 *   piece types uniformly with replacement and K distinct colours
 *   from the palette per draw.
 *
 * The framework auto-renders each spawn: `addCellItem` emits
 * `onItemAdded`, the boards controller builds the visual options,
 * and the world view instantiates a `GameBoardItemObject` for it.
 */
export class PieceSpawnOperations {
  /**
   * Fill every slot in `tray` with one piece. Throws if any slot is
   * already occupied (the spec only deals fresh hands — never partial
   * refills) or if `blockColors` is too small to give every slot a
   * distinct colour.
   *
   * Piece type per slot: uniform random with replacement (same piece
   * can appear in multiple slots).
   * Block colour per slot: uniform random without replacement (K
   * distinct colours).
   */
  public static dealHand(tray: RectGrid, pieceTypes: readonly PieceType[], blockColors: readonly number[], ids: ItemIdGenerator): void {
    if (pieceTypes.length === 0) {
      throw new Error("PieceSpawnOperations: piece catalog is empty");
    }
    if (blockColors.length < tray.columnCount) {
      throw new Error(`PieceSpawnOperations: blockColors has ${blockColors.length} entries but tray has ${tray.columnCount} slots — need at least one colour per slot`);
    }
    const colorPool = PieceSpawnOperations.sampleDistinct(blockColors, tray.columnCount);
    for (let col = 0; col < tray.columnCount; col++) {
      const pieceType = PieceSpawnOperations.pickRandom(pieceTypes);
      const color = colorPool[col]!;
      tray.addCellItem(col, 0, new GameBoardItem(ids.allocate(), pieceType, color));
    }
  }

  /** Uniform random pick from a non-empty list. */
  private static pickRandom<T>(pool: readonly T[]): T {
    return pool[Math.floor(Math.random() * pool.length)]!;
  }

  /** Pick `count` distinct entries from `pool` uniformly at random.
   *  Partial Fisher-Yates shuffle on a copy — O(count) swaps, no
   *  collision retries. Caller must guarantee `pool.length >= count`. */
  private static sampleDistinct<T>(pool: readonly T[], count: number): T[] {
    const copy = pool.slice();
    for (let i = 0; i < count; i++) {
      const j = i + Math.floor(Math.random() * (copy.length - i));
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy.slice(0, count);
  }
}
