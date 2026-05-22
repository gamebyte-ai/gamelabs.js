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
 * Central tuning surface for the static layout.
 *
 * Grid dimensions, tray slot count, world-space cell sizes, spacing
 * between the grid and tray, and per-surface palettes all live here.
 * No layout numbers are hard-coded anywhere else in the example —
 * the views and the camera fit read this single source of truth.
 *
 * Default values are the canonical Block Blast / 1010! configuration:
 * 8×8 grid + 3-slot tray.
 */
export class BlockPuzzleConfig {
  // Grids are addressed by these stable ids. The cell view dispatches
  // its palette by mapping `gridId → BoardKind` via `boardKindFor`.
  public readonly boardIds: BoardIds = {
    grid: 1,
    tray: 2,
  };

  // Playing grid — Block Blast / 1010! standard is 8×8.
  public readonly gridColumns: number = 8;
  public readonly gridRows: number = 8;

  // Tray — K slots in a single row. Each slot holds one piece at a
  // time once pieces are introduced; for now they're empty layout
  // boxes. Three slots is the standard hand size.
  public readonly traySlots: number = 3;

  // World-space cell sizes. Each tray slot is sized to comfortably
  // hold a 3×3 piece (the largest standard 1010! shape), with a bit
  // of breathing room — that's where the 3.5 lands.
  public readonly gridCellSize: number = 1;
  public readonly traySlotSize: number = 3.5;

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
}
