import type { IView } from "@gamebyte/gamelabsjs";
import type { BoardLayoutConfig } from "../models/SlotConfig";
import type { SlotType } from "../constants/SlotType";
import type { SlotPalette } from "./SlotObject";

export interface IBoardView extends IView {
  setLayout(layout: BoardLayoutConfig, palettes: Readonly<Record<SlotType, SlotPalette>>): void;
}
