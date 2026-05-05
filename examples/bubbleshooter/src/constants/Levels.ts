import { BubbleColor } from "./BubbleColor";

export interface ILevelCellPlacement {
  readonly row: number;
  readonly col: number;
  readonly color: BubbleColor;
}

export interface ILevelStonePlacement {
  readonly row: number;
  readonly col: number;
}

export interface ILevel {
  readonly id: string;
  readonly label: string;
  /** `null` means "use the deterministic procedural fill"; an array places exactly those cells. */
  readonly placements: readonly ILevelCellPlacement[] | null;
  /** Cells overridden to {@link BubbleColor.Stone} after the colour fill. */
  readonly stoneCells?: readonly ILevelStonePlacement[];
  /**
   * Override the wide-row column count for this level. Even rows hold
   * exactly this many cells; odd rows hold one fewer. The play area
   * width, side-wall positions, and camera fit all derive from it.
   * Omit to use {@link BubbleShooterConfig.wideRowColumns} (the
   * default).
   */
  readonly wideRowColumns?: number;
  /**
   * How many rows of the grid are hidden ABOVE the visible play
   * area at level start. Positive values shift the grid origin up
   * so the top N rows live above the camera viewport; descents
   * (every {@link BubbleShooterConfig.shotsPerDescend} shots) bring
   * those hidden rows into view. Omit (or set to 0) for a level
   * with no descent runway.
   */
  readonly initialHiddenRows?: number;
}

const R = BubbleColor.Red;
const B = BubbleColor.Blue;
const G = BubbleColor.Green;
const Y = BubbleColor.Yellow;
const P = BubbleColor.Purple;

/**
 * Test levels for the development dropdown. Level 1 is the standard
 * procedural fill; Level 2 is hand-crafted to demonstrate the
 * disconnect-and-fall behaviour (a single same-colour bridge anchors a
 * mixed cluster to the top, so popping the bridge group strands the
 * cluster). Levels 3–5 are placeholders.
 */
export const LEVELS: readonly ILevel[] = [
  {
    id: "level-1",
    label: "Level 1",
    placements: null,
    // Top 6 procedural rows start hidden above the viewport — they
    // descend into view as the player shoots, demonstrating the
    // descending-ceiling mechanic against the standard fill.
    initialHiddenRows: 6,
    // Four stones scattered through the procedural fill so the player
    // sees how they survive matches/bombs/fireballs and only clear via
    // the disconnect-and-fall path.
    stoneCells: [
      { row: 2, col: 3 },
      { row: 4, col: 7 },
      { row: 6, col: 5 },
      { row: 9, col: 8 },
    ],
  },
  {
    id: "level-2",
    label: "Level 2",
    // Narrower play area — wide rows hold 7 bubbles (vs the default
    // 11). Walls + bouncing + camera fit all adapt automatically.
    wideRowColumns: 7,
    // Top 2 rows hidden above the viewport at start; descend brings
    // them in.
    initialHiddenRows: 2,
    placements: [
      // Top wide row (7 cells, 0–6): three Reds on each end framing
      // a Yellow centre. Demonstrates the width visually.
      { row: 0, col: 0, color: R },
      { row: 0, col: 1, color: R },
      { row: 0, col: 3, color: Y },
      { row: 0, col: 5, color: R },
      { row: 0, col: 6, color: R },
      // Narrow row (6 cells, 0–5): mixed bridge.
      { row: 1, col: 1, color: G },
      { row: 1, col: 2, color: B },
      { row: 1, col: 3, color: B },
      { row: 1, col: 4, color: G },
      // Wide row: scatter under the bridge — pop-the-bridge-to-drop scenario.
      { row: 2, col: 1, color: P },
      { row: 2, col: 2, color: Y },
      { row: 2, col: 3, color: P },
      { row: 2, col: 4, color: Y },
      { row: 2, col: 5, color: P },
      // Narrow row: hanging tail.
      { row: 3, col: 2, color: G },
      { row: 3, col: 3, color: G },
    ],
  },
  { id: "level-3", label: "Level 3", placements: [] },
  { id: "level-4", label: "Level 4", placements: [] },
  { id: "level-5", label: "Level 5", placements: [] },
];
