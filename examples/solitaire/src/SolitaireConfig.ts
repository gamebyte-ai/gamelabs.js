import { SCREEN_TRANSITION_TYPES, type ScreenTransition } from "@gamebyte/gamelabsjs";
import { SlotType } from "./constants/SlotType";
import type { SlotPalette } from "./views/SlotObject";
import type { CardVisualConfig } from "./views/CardObject";

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

  // Slightly smaller than a slot so the slot outline is visible behind the card.
  public readonly cardVisual: CardVisualConfig = {
    width: 0.9,
    height: 1.28,
    backColor: 0x1f3a8a,
    faceBackground: 0xf5f5dc,
    redColor: 0xc12424,
    blackColor: 0x111111,
  };

  // Seed for shuffle-driven gameplay. null = non-deterministic (Math.random).
  public readonly shuffleSeed: number | null = 1;
}
