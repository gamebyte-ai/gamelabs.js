import type { GridCoord, IGridView, Unsubscribe } from "@gamebyte/gamelabsjs";
import type { GameBoardItem } from "../models/GameBoardItem";

/**
 * Information emitted when the player releases a piece over the
 * playing grid in a position that the {@link PiecePlacementPredicate}
 * accepted. The controller is the one that actually mutates the
 * model — view stays render-only.
 */
export interface PiecePlacementInfo {
  /** Tray column the piece came from. */
  readonly trayCol: number;
  /** Tray item being placed (carries `pieceType` + `color`). */
  readonly item: GameBoardItem;
  /** Cells on the playing grid the piece should occupy. */
  readonly footprint: readonly GridCoord[];
}

/**
 * Validity predicate the view consults during drag to decide
 * whether the ghost reads as a legal placement, and on drop to
 * decide whether to emit a placement event or snap the piece back.
 *
 * The controller owns the predicate (it has the rules / model
 * access); the view only knows footprint coords.
 */
export type PiecePlacementPredicate = (footprint: readonly GridCoord[]) => boolean;

/**
 * View interface for the boards world view. Adds drag-driven piece
 * placement on top of the framework's `IGridView` auto-sync surface.
 */
export interface IGameBoardsView extends IGridView {
  /** Install / clear the validity predicate. Pass `null` to disable
   *  drag interaction entirely (the view still renders). */
  setPlacementPredicate(predicate: PiecePlacementPredicate | null): void;
  /** Fired on pointer-up when the dragged piece passed
   *  {@link PiecePlacementPredicate}. Invalid drops snap the piece
   *  back to its tray slot inside the view and do not fire this. */
  onPiecePlacement(callback: (info: PiecePlacementInfo) => void): Unsubscribe;
}
