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
 * Predictive clears for the ghost preview. The view calls this
 * with the candidate footprint and the controller returns the
 * cells that *would* be cleared if the player dropped here. The
 * view paints those cells in the dragged piece's colour as part of
 * the ghost — same colour, same opacity — so the player sees the
 * full row/column that's about to disappear.
 *
 * Empty array = no lines would clear (normal ghost with footprint
 * cells only).
 */
export type ClearPreviewProvider = (footprint: readonly GridCoord[]) => readonly GridCoord[];

/**
 * Per-slot placeability map. Keyed by tray column; missing entries
 * default to "placeable" (no fade). The view dims any slot whose
 * entry is `false`.
 */
export type TrayPlaceability = ReadonlyMap<number, boolean>;

/**
 * View interface for the boards world view. Adds drag-driven piece
 * placement on top of the framework's `IGridView` auto-sync surface.
 */
export interface IGameBoardsView extends IGridView {
  /** Install / clear the validity predicate. Pass `null` to disable
   *  drag interaction entirely (the view still renders). */
  setPlacementPredicate(predicate: PiecePlacementPredicate | null): void;
  /** Install / clear the clear-preview provider. Without one the
   *  ghost only shows footprint cells (no line highlight). */
  setClearPreviewProvider(provider: ClearPreviewProvider | null): void;
  /** Master toggle for drag interaction. When `false`,
   *  pointer-down on tray pieces is ignored — used by the game-over
   *  state. Default is `true`. */
  setDragEnabled(enabled: boolean): void;
  /** Update the per-slot placeable / unplaceable state. Unplaceable
   *  slots render with the faded opacity from
   *  `BlockPuzzleConfig.trayUnplaceableOpacity`; placeable slots
   *  render fully opaque. Pass `null` to clear all fades. */
  setTrayPlaceability(perSlot: TrayPlaceability | null): void;
  /** Fired on pointer-up when the dragged piece passed
   *  {@link PiecePlacementPredicate}. Invalid drops snap the piece
   *  back to its tray slot inside the view and do not fire this. */
  onPiecePlacement(callback: (info: PiecePlacementInfo) => void): Unsubscribe;
}
