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
    placements: [
      // Top row: a single Red anchor that holds the whole structure up.
      { row: 0, col: 5, color: R },
      // Bridge: a single Red bubble in row 1, attached via row 0 col 5.
      // This is the same-colour bubble the spec calls for: shoot a 3rd
      // Red here and the entire bridge group pops.
      { row: 1, col: 4, color: R },
      // Mixed-colour cluster hanging off the bridge. None of these are
      // Red, so they survive the pop — but they were only anchored via
      // the bridge, so they detach and fall once it's gone.
      { row: 2, col: 3, color: P },
      { row: 2, col: 4, color: G },
      { row: 2, col: 5, color: Y },
      { row: 3, col: 3, color: G },
      { row: 3, col: 4, color: B },
      { row: 3, col: 5, color: Y },
    ],
  },
  { id: "level-3", label: "Level 3", placements: [] },
  { id: "level-4", label: "Level 4", placements: [] },
  { id: "level-5", label: "Level 5", placements: [] },
];
