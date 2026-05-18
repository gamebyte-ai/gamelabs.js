import { SlotType } from "../constants/SlotType";
import type { BoardLayoutConfig, SlotConfig, SlotRules } from "../models/SlotConfig";

/**
 * Builds the standard Klondike board layout.
 *
 * Row 0 (top): Stock, Waste, [gap], Foundation × 4
 * Row 1 (bottom): Tableau × 7
 *
 * Rule fields are placeholders — the actual rule semantics are filled in
 * once the card / move system lands. The structure is established here so
 * other variants (Spider, FreeCell, ...) can plug into the same renderer.
 */
export class KlondikeLayoutOperations {
  public static create(): BoardLayoutConfig {
    const slotWidth = 1.0;
    const slotHeight = 1.4;
    const slotGapX = 0.15;
    const slotGapZ = 0.4;
    const columnCount = 7;
    const rowCount = 2;

    const stockRules: SlotRules = {
      maxCards: null,
      stackingOffset: { x: 0, z: 0 },
      canDragFrom: false,
      canDropTo: false,
    };

    const wasteRules: SlotRules = {
      maxCards: null,
      stackingOffset: { x: 0, z: 0 },
      canDragFrom: true,
      canDropTo: false,
    };

    const foundationRules: SlotRules = {
      maxCards: 13,
      stackingOffset: { x: 0, z: 0 },
      canDragFrom: true,
      canDropTo: true,
    };

    const tableauRules: SlotRules = {
      maxCards: null,
      stackingOffset: { x: 0, z: 0.28 },
      canDragFrom: true,
      canDropTo: true,
    };

    const slots: SlotConfig[] = [
      { id: "stock", type: SlotType.Stock, position: { col: 0, row: 0 }, rules: stockRules },
      { id: "waste", type: SlotType.Waste, position: { col: 1, row: 0 }, rules: wasteRules },
      { id: "foundation-1", type: SlotType.Foundation, position: { col: 3, row: 0 }, rules: foundationRules },
      { id: "foundation-2", type: SlotType.Foundation, position: { col: 4, row: 0 }, rules: foundationRules },
      { id: "foundation-3", type: SlotType.Foundation, position: { col: 5, row: 0 }, rules: foundationRules },
      { id: "foundation-4", type: SlotType.Foundation, position: { col: 6, row: 0 }, rules: foundationRules },
      { id: "tableau-1", type: SlotType.Tableau, position: { col: 0, row: 1 }, rules: tableauRules },
      { id: "tableau-2", type: SlotType.Tableau, position: { col: 1, row: 1 }, rules: tableauRules },
      { id: "tableau-3", type: SlotType.Tableau, position: { col: 2, row: 1 }, rules: tableauRules },
      { id: "tableau-4", type: SlotType.Tableau, position: { col: 3, row: 1 }, rules: tableauRules },
      { id: "tableau-5", type: SlotType.Tableau, position: { col: 4, row: 1 }, rules: tableauRules },
      { id: "tableau-6", type: SlotType.Tableau, position: { col: 5, row: 1 }, rules: tableauRules },
      { id: "tableau-7", type: SlotType.Tableau, position: { col: 6, row: 1 }, rules: tableauRules },
    ];

    return {
      columnCount,
      rowCount,
      slotWidth,
      slotHeight,
      slotGapX,
      slotGapZ,
      slots,
    };
  }
}
