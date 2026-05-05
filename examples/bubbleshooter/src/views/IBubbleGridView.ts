import type { IView } from "@gamebyte/gamelabsjs";
import type { BubbleColor } from "../constants/BubbleColor";

/**
 * The cluster grid — placed bubbles in the hex matrix plus the
 * jelly-wobble snap shake that ripples through neighbouring bubbles
 * after a fired bubble lands.
 */
export interface IBubbleGridView extends IView {
  setBubble(row: number, col: number, color: BubbleColor): void;
  removeBubble(row: number, col: number): void;
  playSnapShake(row: number, col: number): void;
  updateBubbleShakes(dt: number): void;
  /**
   * Re-query the layout for every bubble's world position and snap
   * each mesh to its new spot. Called when the descending-ceiling
   * mechanic shifts the grid origin — model row indices stay the
   * same but cell world Ys move.
   */
  repositionAllBubbles(): void;
  /**
   * Dispose + rebuild the cell-outline rings. Called on width
   * change (per-level `wideRowColumns` override) where the per-row
   * column count changes, so the outline count and positions must
   * rebuild from the new layout.
   */
  rebuildCellOutlines(): void;
}
