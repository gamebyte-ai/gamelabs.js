import { SCREEN_TRANSITION_TYPES, type ScreenTransition } from "@gamebyte/gamelabsjs";
import { SlotType } from "./constants/SlotType";
import type { SlotPalette } from "./views/SlotObject";

export class SolitaireConfig {
  public readonly transitions: {
    gameScreenEnter: ScreenTransition;
  } = {
    gameScreenEnter: {
      type: SCREEN_TRANSITION_TYPES.INSTANT,
      durationMs: 0,
    },
  };

  public readonly slotPalettes: Readonly<Record<SlotType, SlotPalette>> = {
    [SlotType.Stock]: { fill: 0x1a2a4a, outline: 0x4a90e2 },
    [SlotType.Waste]: { fill: 0x2a1f4a, outline: 0xb98ce5 },
    [SlotType.Foundation]: { fill: 0x1a4a2f, outline: 0x4ae28a },
    [SlotType.Tableau]: { fill: 0x4a3a1a, outline: 0xe2b54a },
  };
}
