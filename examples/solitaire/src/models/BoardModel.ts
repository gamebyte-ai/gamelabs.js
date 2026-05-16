import type { BoardLayoutConfig, SlotConfig } from "./SlotConfig";
import type { IBoardModel } from "./IBoardModel";
import type { SlotType } from "../constants/SlotType";

export class BoardModel implements IBoardModel {
  private _layout: BoardLayoutConfig | null = null;

  public get layout(): BoardLayoutConfig | null {
    return this._layout;
  }

  public get slots(): readonly SlotConfig[] {
    return this._layout?.slots ?? [];
  }

  public loadLayout(layout: BoardLayoutConfig): void {
    this._layout = layout;
  }

  public getSlotById(id: string): SlotConfig | null {
    return this._layout?.slots.find((s) => s.id === id) ?? null;
  }

  public getSlotsByType(type: SlotType): readonly SlotConfig[] {
    return this._layout?.slots.filter((s) => s.type === type) ?? [];
  }
}
