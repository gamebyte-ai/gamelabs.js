import { SCREEN_TRANSITION_TYPES, type ScreenTransition } from "@gamebyte/gamelabsjs";
import { BoardKind } from "./constants/BoardKind";

export interface BoardPalette {
  /** Cell fill colour. Tray slots are intentionally larger and lighter
   *  than grid cells so the two surfaces read as distinct at a glance. */
  readonly cellFill: number;
  /** Thin border on each cell. Doubles as the surface accent. */
  readonly cellOutline: number;
}

/**
 * Stable identifier each grid registers with `GridsModel` under. Kept
 * as a const enum'-style numeric record so the cell view can look up
 * the {@link BoardKind} of any grid it is rendering by id alone.
 */
export interface BoardIds {
  readonly grid: number;
  readonly tray: number;
}

/**
 * 2D shape of a piece, expressed as a list of `(col, row)` offsets
 * within the piece's own bounding box. `(0, 0)` is the top-left
 * corner; the visual centres the bounding box on its host cell so
 * pieces of different sizes all sit nicely inside a tray slot or
 * snap onto a single anchor cell on the playing grid.
 */
export type PieceCells = readonly (readonly [number, number])[];

export interface PieceType {
  /** Stable string id, used only for logging / debugging — the
   *  runtime references pieces by object identity. */
  readonly name: string;
  /** Block layout. See {@link PieceCells}. */
  readonly cells: PieceCells;
}

/**
 * Visual constants for the drag pipeline. The lifted piece floats
 * above the grid plane while following the pointer; the ghost
 * preview snaps onto the candidate footprint cells. Both Y values
 * are tuned to layer correctly against the static board: ghost
 * sits above grid cell paint (Y = 0.005 / 0.01) so its colour
 * reads on top, lifted piece sits above any placed pieces (Y =
 * PieceMeshBuilder.DEFAULT_BLOCK_Y = 0.05).
 */
export interface DragConfig {
  /** World Y at which the lifted piece floats. */
  readonly liftedY: number;
  /** World Y the ghost preview renders at. */
  readonly ghostY: number;
  /** 0..1 — semi-transparent so the ghost reads as a preview rather
   *  than a placed piece. */
  readonly ghostOpacity: number;
  /**
   * Pointer-area margin around the playing grid, in cell-size units.
   * Placement is active whenever the pointer (ground projection)
   * lies within the grid bbox extended by this margin on every
   * side; outside the area no ghost is shown and a drop snaps the
   * piece back to its tray slot.
   *
   * Inside the area, the raw target cell is computed from the
   * piece's top-left (round-to-nearest) and then **clamped** so the
   * full piece footprint fits inside the grid — out-of-bounds is
   * never a reason to reject a placement, only cell occupancy is.
   * This gives the piece a magnetic-to-edges feel: a large piece
   * dragged toward a corner sticks to that corner regardless of
   * which part of the piece the pointer was grabbed.
   *
   * Default `0.5` extends the placement zone by half a cell on every
   * side; raise it to give the player more leeway around the grid
   * edges, lower it for a tighter pointer-area gate.
   */
  readonly pointerAreaMargin: number;
}

/**
 * Central tuning surface for the static layout, the piece catalog,
 * and the block colour palette.
 *
 * Grid dimensions, tray slot count, world-space cell sizes, spacing,
 * per-surface palettes, the piece catalog, the block colour palette,
 * and the per-block visual size all live here. Adding a new piece
 * type is a single entry in {@link pieceTypes}; adding or
 * recolouring a block colour is a single entry in {@link blockColors}.
 *
 * Piece colour is **not** a property of a piece type — every piece
 * type can render in any colour. The spawn layer picks a colour per
 * spawn (the initial tray deal picks K distinct colours from
 * {@link blockColors} so the slots always read as different).
 *
 * Default values are the canonical Block Blast / 1010! configuration:
 * 8×8 grid + 3-slot tray, with eight starter piece types and an
 * eight-colour block palette.
 */
export class BlockPuzzleConfig {
  // Grids are addressed by these stable ids. The cell view dispatches
  // its palette by mapping `gridId → BoardKind` via `boardKindFor`,
  // and `blockSizeFor` picks the per-block render size per surface.
  public readonly boardIds: BoardIds = {
    grid: 1,
    tray: 2,
  };

  // Playing grid — Standard is 9x9.
  public readonly gridColumns: number = 9;
  public readonly gridRows: number = 9;

  // Tray — K slots in a single row. Each slot holds one piece (one
  // `GameBoardItem`); the visual renders the piece's full shape
  // centred inside the slot. Three slots is the standard hand size.
  public readonly traySlots: number = 3;

  // World-space cell sizes. The playing grid uses one block per cell;
  // the tray slot is sized so K slots fit inside the playing grid's
  // width — for the default 8×8 grid and 3-slot tray that's 2.5 ≤
  // 8/3 ≈ 2.67. Tuning either `gridColumns`, `gridCellSize`, or
  // `traySlots` should be matched with `traySlotSize` so the tray
  // stays within the grid's footprint.
  public readonly gridCellSize: number = 1;
  public readonly traySlotSize: number = 2.5;

  // World-space size of one block when rendered inside a tray slot.
  // Chosen so the longest piece in the catalog (1×5 line) fits inside
  // `traySlotSize` with margin: 5 × 0.4 = 2.0 ≤ 2.5. Tuning this
  // scales every piece's visual in the tray uniformly; pieces on
  // the playing grid render at `gridCellSize`.
  public readonly trayPieceCellSize: number = 0.4;

  // Vertical gap between the bottom of the playing grid and the top
  // of the tray, in world units.
  public readonly gridToTraySpacing: number = 1.5;

  // World-space margin reserved around the combined grid + tray
  // bounding box. The camera ortho size is recomputed on every resize
  // so the full content + margin fits regardless of aspect ratio.
  public readonly boardMargin: number = 1;

  public readonly palettes: Readonly<Record<BoardKind, BoardPalette>> = {
    [BoardKind.Grid]: {
      cellFill: 0x1f2a44,
      cellOutline: 0x3b4a6b,
    },
    [BoardKind.Tray]: {
      cellFill: 0x2a1f44,
      cellOutline: 0x6b3b8a,
    },
  };

  /**
   * The full piece catalog. Each entry is a self-contained shape
   * definition — colour is decoupled and assigned at spawn time
   * from {@link blockColors}, so any piece can appear in any colour.
   * Adding a new piece is one new entry here and nothing else.
   */
  public readonly pieceTypes: readonly PieceType[] = [
    { name: "smallL", cells: [[0, 0], [0, 1], [1, 1]] },
    { name: "mediumL", cells: [[0, 0], [0, 1], [0, 2], [1, 2]] },
    { name: "largeL", cells: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]] },
    { name: "square2", cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
    {
      name: "square3",
      cells: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]],
    },
    { name: "line3", cells: [[0, 0], [1, 0], [2, 0]] },
    { name: "line4", cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
    { name: "line5", cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },
  ];

  /**
   * Block colour palette. The spawn picker chooses K distinct
   * colours from this list for the K tray slots, so the player
   * always sees three different colours at once. Must contain at
   * least {@link traySlots} entries.
   *
   * Adding or recolouring a colour is one entry here — no piece
   * definition or rendering code touches the palette.
   */
  public readonly blockColors: readonly number[] = [
    0xff5566, 0xff9944, 0xffcc33, 0x66cc66, 0x33aaaa, 0x5599ff, 0x9966ff, 0xff66cc,
  ];

  /**
   * Drag-pipeline visual tuning. Anchor offsets live here so the
   * view stays render-only; tweaking ghost translucency / lifted
   * piece height is a config edit, not a view change.
   */
  public readonly drag: DragConfig = {
    liftedY: 0.6,
    ghostY: 0.04,
    ghostOpacity: 0.55,
    pointerAreaMargin: 0.5,
  };

  public readonly transitions: { readonly gameScreenEnter: ScreenTransition } = {
    gameScreenEnter: { type: SCREEN_TRANSITION_TYPES.INSTANT, durationMs: 0 },
  };

  /**
   * Resolve which surface a grid id belongs to. The cell view uses
   * this to pick its palette without needing to know about either
   * grid's columnSize or rowCount — only its id.
   */
  public boardKindFor(gridId: number): BoardKind {
    if (gridId === this.boardIds.grid) return BoardKind.Grid;
    if (gridId === this.boardIds.tray) return BoardKind.Tray;
    throw new Error(`BlockPuzzleConfig: unknown grid id ${gridId}`);
  }

  /**
   * Per-block visual size for items rendered on the given grid.
   * Tray pieces render small enough that the largest shape fits in
   * a slot; pieces placed on the playing grid (later steps) render
   * at `gridCellSize` so they line up with the underlying cells.
   */
  public blockSizeFor(gridId: number): number {
    return gridId === this.boardIds.tray ? this.trayPieceCellSize : this.gridCellSize;
  }
}
