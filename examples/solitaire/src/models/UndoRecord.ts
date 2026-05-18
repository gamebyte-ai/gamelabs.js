import type { IPile } from "./IPile";

/**
 * Discriminated union of reversible operations the controller can
 * push onto the undo history. Each variant carries the minimum state
 * needed to roll back the model deterministically.
 *
 * - `move`: a card transfer (drag-drop or quick-placement), optionally
 *   paired with an auto-flip on the origin tableau. `autoFlippedCardId`
 *   is the card that was revealed face-up by the move (null if none).
 *   `wastePreviousFanAnchorIndex` is the waste fan-anchor before the
 *   move and is non-null only when origin or target is the waste pile;
 *   the move can collapse the anchor to −1 by emptying the current fan
 *   batch, so undo must restore it explicitly.
 * - `draw`: a stock→waste draw of `count` cards. `previousFanAnchorIndex`
 *   captures the waste fan-anchor before the draw so undo can restore
 *   any pre-existing fan after popping the drawn batch.
 * - `recycle`: a waste→stock recycle of `count` cards (waste was fully
 *   consumed). `previousFanAnchorIndex` is the waste anchor before the
 *   recycle.
 */
export type UndoRecord =
  | {
      readonly kind: "move";
      readonly origin: IPile;
      readonly target: IPile;
      readonly count: number;
      readonly autoFlippedCardId: number | null;
      readonly wastePreviousFanAnchorIndex: number | null;
      /** Total score awarded when the action committed (move points
       *  + auto-flip-reveal points, if any). Undo subtracts this so
       *  the player is returned to the pre-action score before the
       *  flat undo penalty is layered on top. */
      readonly scoreDelta: number;
    }
  | {
      readonly kind: "draw";
      readonly count: number;
      readonly previousFanAnchorIndex: number;
      readonly scoreDelta: number;
    }
  | {
      readonly kind: "recycle";
      readonly count: number;
      readonly previousFanAnchorIndex: number;
      readonly scoreDelta: number;
    };
