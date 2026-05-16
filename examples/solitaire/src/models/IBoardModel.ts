import { InjectionToken } from "@gamebyte/gamelabsjs";
import type { BoardLayoutConfig, SlotConfig } from "./SlotConfig";
import type { SlotType } from "../constants/SlotType";

export interface IBoardModel {
  readonly layout: BoardLayoutConfig | null;
  readonly slots: readonly SlotConfig[];
  getSlotById(id: string): SlotConfig | null;
  getSlotsByType(type: SlotType): readonly SlotConfig[];
}

export const IBoardModel = new InjectionToken<IBoardModel>("IBoardModel");
