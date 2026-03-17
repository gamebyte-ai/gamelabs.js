import type { IGameGridObjectPointerListener, IInputManager } from "gamelabsjs";
import { GameGridItemObject, GameGridPreset } from "gamelabsjs";

export class Example03GridItemObject extends GameGridItemObject {
  public constructor(itemId: number, preset: GameGridPreset, pointerListener: IGameGridObjectPointerListener, inputManager: IInputManager | null) {
    super(itemId, preset, pointerListener, inputManager);
  }
}
