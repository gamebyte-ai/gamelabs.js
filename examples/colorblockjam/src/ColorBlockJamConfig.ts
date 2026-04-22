import { SCREEN_TRANSITION_TYPES, type ScreenTransition } from "@gamebyte/gamelabsjs";

/**
 * Grid cell coordinate. `col` is the X axis, `row` is the Z axis. Origin 0.
 */
export type CellCoord = { readonly col: number; readonly row: number };

/** Edge of the grid a door sits on. */
export type DoorSide = "top" | "bottom" | "left" | "right";

/**
 * Descriptor for a block placed on the grid at level start.
 *
 * `shape` is a normalized offset list (min col = min row = 0). `anchor` is
 * the initial grid cell of the shape's origin — the block's absolute cells
 * are `anchor + shape[i]`.
 */
export type BlockDescriptor = {
  readonly id: number;
  readonly colorIndex: number;
  readonly shape: readonly CellCoord[];
  readonly anchor: CellCoord;
};

/**
 * Descriptor for a colored exit on a grid edge.
 *
 * `spanStart`/`spanEnd` are inclusive indices on the perpendicular axis:
 * - top / bottom: column indices (along X),
 * - left / right: row indices (along Z).
 *
 * A block can clear through the door only if its perpendicular span
 * matches the door span exactly, its color matches, and nothing is in
 * the path.
 */
export type DoorDescriptor = {
  readonly id: number;
  readonly side: DoorSide;
  readonly spanStart: number;
  readonly spanEnd: number;
  readonly colorIndex: number;
};

/**
 * All data needed to build a single level. Pure data — no behaviour here,
 * so adding / editing levels is just appending to {@link ColorBlockJamConfig.levels}.
 */
export type LevelDescriptor = {
  readonly cols: number;
  readonly rows: number;
  readonly blocks: readonly BlockDescriptor[];
  readonly doors: readonly DoorDescriptor[];
};

/** Common shape factories used across level definitions. */
const SHAPES = {
  square1x1: [{ col: 0, row: 0 }] as readonly CellCoord[],
  rect1x2: [
    { col: 0, row: 0 },
    { col: 1, row: 0 },
  ] as readonly CellCoord[],
  rect1x3: [
    { col: 0, row: 0 },
    { col: 1, row: 0 },
    { col: 2, row: 0 },
  ] as readonly CellCoord[],
  square2x2: [
    { col: 0, row: 0 },
    { col: 1, row: 0 },
    { col: 0, row: 1 },
    { col: 1, row: 1 },
  ] as readonly CellCoord[],
  lShape: [
    { col: 0, row: 0 },
    { col: 0, row: 1 },
    { col: 1, row: 1 },
  ] as readonly CellCoord[],
};

export class ColorBlockJamConfig {

  /** Side length of a grid cell in world units. */
  public readonly cellSize = 1.0;
  /** Vertical thickness of the base grid plate (cosmetic). */
  public readonly cellHeight = 0.08;
  /** Height of a block cube. Stands above the grid plate. */
  public readonly blockHeight = 0.2;
  /** Lift above blockHeight while a block is being dragged. */
  public readonly dragLiftAmount = 0.2;

  /**
   * Per-side margin (in cell units) subtracted from every block's
   * rendered footprint AND its collider. A block still logically occupies
   * the same grid cells — its visuals and collision footprint are each a
   * little smaller than a full cell, leaving a subtle gap on all four
   * sides. This gives drag collision a cushion so float drift near a
   * 1-cell gap can't make a shape "feel fat".
   *
   * Must be within the 0..0.5 range; `0.04` is subtle (~4% of cell).
   */
  public readonly blockMargin = 0.04;

  /**
   * Exponential smoothing time (seconds) for drag motion: each frame,
   * the block's rendered position eases toward the cursor's grid
   * position with factor `1 - exp(-dt / dragSmoothingTime)`. Smaller =
   * stiffer / snappier; larger = softer / more lag. 0.07s ≈ ~0.2 lerp
   * factor at 60 fps. Collision and grid-edge rules still apply to the
   * smoothed position at every frame.
   */
  public readonly dragSmoothingTime = 0.07;

  /** Color of the grid base plate. */
  public readonly gridBaseColor = 0x1e293b;
  /** Color of the outline around each grid cell. */
  public readonly gridLineColor = 0x475569;
  /** Color of a cell highlighted under the currently dragged block. */
  public readonly cellDragHighlightColor = 0x38bdf8;

  /** Palette indexed by `colorIndex` on blocks / doors. */
  public readonly colors: readonly number[] = [
    0xef4444, // 0: red
    0x22c55e, // 1: green
    0x3b82f6, // 2: blue
    0xeab308, // 3: yellow
    0xa855f7, // 4: purple
  ];

  /**
   * Snap tolerance (fraction of a cell) used when checking if a dragged
   * block is "parked" in the cell(s) directly in front of a door — i.e.
   * both its col and row float coords round to integers within this
   * distance. Below it the block is considered aligned for auto-exit.
   */
  public readonly exitAlignTolerance = 0.22;

  /**
   * Duration of the exit animation in seconds. The block slides
   * perpendicularly out of its door over this window and shrinks to
   * nothing as it leaves; cells are released back to the grid on
   * completion.
   */
  public readonly exitAnimationSeconds = 0.3;

  /**
   * How far (in grid cells) the block's centre travels past the edge
   * during the exit animation before it's removed from the scene. Large
   * enough that the block visibly clears the door opening on all
   * expected camera framings.
   */
  public readonly exitAnimationDistanceCells = 2.2;

  /**
   * Five hand-authored levels of increasing difficulty. Each level is pure
   * data (grid size + block list + door list) so adding or re-ordering
   * levels only means editing this array.
   *
   * Difficulty progression:
   *  1 — 4×5,  2 blocks, 2 shapes, no blockers (warm-up).
   *  2 — 5×5,  3 blocks, 3 shapes, 1 blocking chain.
   *  3 — 5×6,  4 blocks, 4 shapes, 2 blocking chains.
   *  4 — 5×7,  5 blocks, all 5 shapes, 2 blocking chains.
   *  5 — 6×7,  6 blocks, all 5 shapes + repeat, 3 blocking chains.
   *
   * Door-edge allocations never overlap on the same side. Colour indices
   * reference {@link colors}: 0 red, 1 green, 2 blue, 3 yellow, 4 purple.
   */
  public readonly levels: readonly LevelDescriptor[] = [
    // Level 1 — two simple blocks, direct exits, no blockers.
    {
      cols: 4,
      rows: 5,
      blocks: [
        { id: 0, colorIndex: 0, shape: SHAPES.square1x1, anchor: { col: 1, row: 3 } },
        { id: 1, colorIndex: 2, shape: SHAPES.rect1x2, anchor: { col: 1, row: 1 } },
      ],
      doors: [
        { id: 0, side: "top", spanStart: 1, spanEnd: 2, colorIndex: 2 },
        { id: 1, side: "bottom", spanStart: 1, spanEnd: 1, colorIndex: 0 },
      ],
    },
    // Level 2 — three blocks with one blocker (red must move before yellow).
    {
      cols: 5,
      rows: 5,
      blocks: [
        {
          id: 0,
          colorIndex: 3,
          shape: SHAPES.rect1x3,
          anchor: { col: 0, row: 3 },
        },
        { id: 1, colorIndex: 0, shape: SHAPES.square1x1, anchor: { col: 1, row: 1 } },
        { id: 2, colorIndex: 1, shape: SHAPES.square2x2, anchor: { col: 3, row: 0 } },
      ],
      doors: [
        { id: 0, side: "top", spanStart: 0, spanEnd: 2, colorIndex: 3 },
        { id: 1, side: "left", spanStart: 1, spanEnd: 1, colorIndex: 0 },
        { id: 2, side: "right", spanStart: 1, spanEnd: 2, colorIndex: 1 },
      ],
    },
    // Level 3 — four blocks, two blocking chains.
    {
      cols: 5,
      rows: 6,
      blocks: [
        {
          id: 0,
          colorIndex: 3,
          shape: SHAPES.rect1x3,
          anchor: { col: 0, row: 4 },
        },
        {
          id: 1,
          colorIndex: 1,
          shape: SHAPES.square2x2,
          anchor: { col: 1, row: 2 },
        },
        { id: 2, colorIndex: 0, shape: SHAPES.square1x1, anchor: { col: 2, row: 1 } },
        { id: 3, colorIndex: 2, shape: SHAPES.rect1x2, anchor: { col: 3, row: 1 } },
      ],
      doors: [
        { id: 0, side: "top", spanStart: 0, spanEnd: 2, colorIndex: 3 },
        { id: 1, side: "top", spanStart: 3, spanEnd: 4, colorIndex: 2 },
        { id: 2, side: "left", spanStart: 2, spanEnd: 3, colorIndex: 1 },
        { id: 3, side: "right", spanStart: 1, spanEnd: 1, colorIndex: 0 },
      ],
    },
    // Level 4 — five blocks, all five shape families, two blocking chains.
    {
      cols: 5,
      rows: 7,
      blocks: [
        {
          id: 0,
          colorIndex: 3,
          shape: SHAPES.rect1x3,
          anchor: { col: 0, row: 5 },
        },
        { id: 1, colorIndex: 1, shape: SHAPES.square2x2, anchor: { col: 1, row: 3 } },
        { id: 2, colorIndex: 0, shape: SHAPES.square1x1, anchor: { col: 2, row: 2 } },
        { id: 3, colorIndex: 2, shape: SHAPES.rect1x2, anchor: { col: 3, row: 2 } },
        { id: 4, colorIndex: 4, shape: SHAPES.lShape, anchor: { col: 3, row: 4 } },
      ],
      doors: [
        { id: 0, side: "top", spanStart: 0, spanEnd: 2, colorIndex: 3 },
        { id: 1, side: "top", spanStart: 3, spanEnd: 4, colorIndex: 2 },
        { id: 2, side: "left", spanStart: 3, spanEnd: 4, colorIndex: 1 },
        { id: 3, side: "right", spanStart: 2, spanEnd: 2, colorIndex: 0 },
        { id: 4, side: "bottom", spanStart: 3, spanEnd: 4, colorIndex: 4 },
      ],
    },
    // Level 5 — six blocks on a 6×7 grid. Yellow at the bottom needs the
    // full column to reach its top door, so the two blockers on row 3
    // (blue 1×1 and green 2×2) and the red 1×1 on row 1 all have to move
    // out of its way. The second blue (1×2) and the purple L-shape each
    // need a couple of steps of their own — three effective chains.
    {
      cols: 6,
      rows: 7,
      blocks: [
        {
          id: 0,
          colorIndex: 3,
          shape: SHAPES.rect1x3,
          anchor: { col: 0, row: 6 },
        },
        {
          id: 1,
          colorIndex: 2,
          shape: SHAPES.rect1x2,
          anchor: { col: 3, row: 5 },
        },
        { id: 2, colorIndex: 1, shape: SHAPES.square2x2, anchor: { col: 2, row: 3 } },
        { id: 3, colorIndex: 0, shape: SHAPES.square1x1, anchor: { col: 1, row: 1 } },
        { id: 4, colorIndex: 4, shape: SHAPES.lShape, anchor: { col: 4, row: 1 } },
        { id: 5, colorIndex: 2, shape: SHAPES.square1x1, anchor: { col: 1, row: 3 } },
      ],
      doors: [
        { id: 0, side: "top", spanStart: 0, spanEnd: 2, colorIndex: 3 },
        { id: 1, side: "top", spanStart: 3, spanEnd: 4, colorIndex: 4 },
        { id: 2, side: "left", spanStart: 0, spanEnd: 0, colorIndex: 0 },
        { id: 3, side: "left", spanStart: 3, spanEnd: 3, colorIndex: 2 },
        { id: 4, side: "right", spanStart: 3, spanEnd: 4, colorIndex: 1 },
        { id: 5, side: "bottom", spanStart: 3, spanEnd: 4, colorIndex: 2 },
      ],
    },
  ];

  public readonly transitions: { readonly gameScreenEnter: ScreenTransition } = {
    gameScreenEnter: {
      type: SCREEN_TRANSITION_TYPES.INSTANT,
      durationMs: 0,
    },
  };
}
