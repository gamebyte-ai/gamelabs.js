import type { BoardLayoutConfig } from "../models/SlotConfig";
import type { ISlot } from "../models/Slot";

export interface BoardContentBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

/**
 * Computes the axis-aligned world-space bounds of the board's current
 * content — slot rectangles plus the card-fan extension implied by each
 * slot's `stackingOffset × (cards.length − 1)`. Used by the app to fit the
 * top-down camera around whatever the board currently shows.
 */
export class BoardBoundsCalculator {
  public static compute(layout: BoardLayoutConfig, slots: readonly ISlot[]): BoardContentBounds | null {
    const boardWidth = layout.columnCount * layout.slotWidth + (layout.columnCount - 1) * layout.slotGapX;
    const boardHeight = layout.rowCount * layout.slotHeight + (layout.rowCount - 1) * layout.slotGapZ;
    const originX = -boardWidth / 2 + layout.slotWidth / 2;
    const originZ = -boardHeight / 2 + layout.slotHeight / 2;
    const halfSlotW = layout.slotWidth / 2;
    const halfSlotH = layout.slotHeight / 2;

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (const slot of slots) {
      const cx = originX + slot.config.position.col * (layout.slotWidth + layout.slotGapX);
      const cz = originZ + slot.config.position.row * (layout.slotHeight + layout.slotGapZ);
      const lastIndex = Math.max(0, slot.cards.length - 1);
      const fanX = cx + slot.config.rules.stackingOffset.x * lastIndex;
      const fanZ = cz + slot.config.rules.stackingOffset.z * lastIndex;
      minX = Math.min(minX, cx - halfSlotW, fanX - halfSlotW);
      maxX = Math.max(maxX, cx + halfSlotW, fanX + halfSlotW);
      minZ = Math.min(minZ, cz - halfSlotH, fanZ - halfSlotH);
      maxZ = Math.max(maxZ, cz + halfSlotH, fanZ + halfSlotH);
    }

    if (minX === Infinity) return null;
    return { minX, maxX, minZ, maxZ };
  }
}
