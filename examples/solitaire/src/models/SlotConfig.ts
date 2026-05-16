import type { SlotType } from "../constants/SlotType";

/**
 * Per-slot rule placeholders. The fields below describe behaviour each slot
 * type will later enforce (placement validation, stacking visuals, capacity).
 * Variant layouts populate these; the actual rule logic is implemented in a
 * later step.
 */
export interface SlotRules {
  // Hard cap on cards the slot can hold. null = unlimited.
  readonly maxCards: number | null;
  // Visual offset applied to each successive card in the slot's stack, in
  // world units along the board plane.
  readonly stackingOffset: { readonly x: number; readonly z: number };
  // Whether the slot is allowed to be the source of a drag/move.
  readonly canDragFrom: boolean;
  // Whether the slot accepts dropped cards from other slots.
  readonly canDropTo: boolean;
}

/**
 * Slot coordinate inside the board layout's logical grid. The grid is shared
 * by all variants — the renderer translates these to world positions using
 * the layout's slot size + gap.
 */
export interface SlotPosition {
  readonly col: number;
  readonly row: number;
}

/**
 * A single slot definition inside a variant's board layout.
 */
export interface SlotConfig {
  readonly id: string;
  readonly type: SlotType;
  readonly position: SlotPosition;
  readonly rules: SlotRules;
}

/**
 * Full board layout for a Solitaire variant. Each variant (Klondike, Spider,
 * FreeCell, ...) produces one of these and the rendering layer is agnostic
 * of which variant it received.
 */
export interface BoardLayoutConfig {
  readonly columnCount: number;
  readonly rowCount: number;
  readonly slotWidth: number;
  readonly slotHeight: number;
  readonly slotGapX: number;
  readonly slotGapZ: number;
  readonly slots: readonly SlotConfig[];
}
