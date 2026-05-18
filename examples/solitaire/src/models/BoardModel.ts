import type { BoardLayoutConfig } from "./SlotConfig";
import type { IBoardModel } from "./IBoardModel";
import type { SlotType } from "../constants/SlotType";
import { Slot } from "./Slot";

export class BoardModel implements IBoardModel {
  private _layout: BoardLayoutConfig | null = null;
  private _slots: Slot[] = [];

  public get layout(): BoardLayoutConfig | null {
    return this._layout;
  }

  public get slots(): readonly Slot[] {
    return this._slots;
  }

  public loadLayout(layout: BoardLayoutConfig): void {
    this._layout = layout;
    this._slots = layout.slots.map((config) => new Slot(config));
  }

  public getSlotById(id: string): Slot | null {
    return this._slots.find((s) => s.config.id === id) ?? null;
  }

  public getSlotsByType(type: SlotType): readonly Slot[] {
    return this._slots.filter((s) => s.config.type === type);
  }
}
