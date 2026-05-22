import type { GridCoord, IBaseGrid } from "@gamebyte/gamelabsjs";

/**
 * Structural seam: which cells should be cleared after a placement.
 *
 * The example has no pieces and no placements yet — step 1 is the
 * static grid + tray layout only. This interface is named (not
 * implemented) so the placement pipeline can be wired against it
 * once pieces exist without restructuring later.
 *
 * Planned variants:
 * - **Full row/column clear** (step 3): the initial Block Blast /
 *   1010! rule. After a placement, any fully-filled row or column
 *   clears.
 * - **Region / colour-match**: any connected group of N+ same-colour
 *   cells clears (Block Blast variant; Candy-Crush-flavoured).
 * - **Hybrid**: e.g. lines clear AND any same-colour region of 5+
 *   also clears, both triggered by the same placement.
 *
 * `placedCells` carries the cells the just-placed piece occupies, so
 * region-based rules can seed their search from the placement
 * footprint rather than scanning the whole grid every turn.
 */
export interface IClearRule {
  /** Cells that should be cleared in response to a placement at
   *  `placedCells`. Returning an empty array means no clears trigger
   *  for this placement. */
  computeClears(grid: IBaseGrid, placedCells: readonly GridCoord[]): readonly GridCoord[];
}
