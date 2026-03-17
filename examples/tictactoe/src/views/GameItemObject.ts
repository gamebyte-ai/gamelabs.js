import type { IGridObjectListener, IInputManager } from "gamelabsjs";
import { GridItemObject, GridPreset } from "gamelabsjs";

export class GameItemObject extends GridItemObject {
  public constructor(itemId: number, preset: GridPreset, pointerListener: IGridObjectListener, inputManager: IInputManager | null) {
    super(itemId, preset, pointerListener, inputManager);
  }
}
