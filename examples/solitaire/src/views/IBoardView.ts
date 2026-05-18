import type { IView } from "@gamebyte/gamelabsjs";
import type { BoardLayoutConfig } from "../models/SlotConfig";
import type { SlotType } from "../constants/SlotType";
import type { SlotPalette } from "./SlotObject";
import type { CardVisualConfig } from "./CardObject";
import type { ISlot } from "../models/Slot";

export interface BoardRenderInput {
  readonly layout: BoardLayoutConfig;
  readonly slots: readonly ISlot[];
  readonly palettes: Readonly<Record<SlotType, SlotPalette>>;
  readonly cardVisual: CardVisualConfig;
}

export interface IBoardView extends IView {
  setBoard(input: BoardRenderInput): void;
}
