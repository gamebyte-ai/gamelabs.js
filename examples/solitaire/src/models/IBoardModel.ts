import { InjectionToken } from "@gamebyte/gamelabsjs";
import type { BoardLayoutConfig } from "./SlotConfig";
import type { SlotType } from "../constants/SlotType";
import type { ISlot } from "./Slot";

export interface IBoardModel {
  readonly layout: BoardLayoutConfig | null;
  readonly slots: readonly ISlot[];
  getSlotById(id: string): ISlot | null;
  getSlotsByType(type: SlotType): readonly ISlot[];
}

export const IBoardModel = new InjectionToken<IBoardModel>("IBoardModel");
