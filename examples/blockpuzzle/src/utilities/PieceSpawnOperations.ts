import type { RectGrid } from "@gamebyte/gamelabsjs";
import type { PieceType } from "../BlockPuzzleConfig";
import { GameBoardItem } from "../modules/gamegrid/models/GameBoardItem";

/**
 * Piece-spawn operations on top of the framework's grid model.
 *
 * Step 2 only covers the initial deal — one piece per tray slot,
 * piece type picked uniformly at random from the catalog (with
 * replacement, so the same piece can appear in multiple slots), and
 * block colour picked **without replacement** from the palette so
 * the K tray slots always read as K distinct colours.
 *
 * The framework auto-renders each spawn: `addCellItem` emits
 * `onItemAdded`, the boards controller builds
 * `GameBoardItemObjectOptions` carrying the `pieceType` + `color`,
 * and the world view instantiates a `GameBoardItemObject` for it.
 */
export class PieceSpawnOperations {
  /**
   * Deal one piece into every tray slot. `nextItemId` is the caller's
   * monotonic item-id counter; the function consumes one id per slot
   * and returns the next free id so successive deals (added in later
   * steps for refill) keep producing unique ids without cross-talk.
   *
   * Throws if `blockColors` has fewer entries than `tray.columnCount`
   * — without that the "every slot a distinct colour" invariant can't
   * hold for the initial deal.
   */
  public static dealInitialHand(tray: RectGrid, pieceTypes: readonly PieceType[], blockColors: readonly number[], nextItemId: number): number {
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
      tray.addCellItem(col, 0, new GameBoardItem(nextItemId++, pieceType, color));
    }
    return nextItemId;
  }

  /** Uniform random pick from a non-empty list. Kept as a method so
   *  refill (step 3+) can share the exact same draw policy. */
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
