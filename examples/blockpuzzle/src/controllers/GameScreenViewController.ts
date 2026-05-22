import type { IInstanceResolver, IViewController } from "@gamebyte/gamelabsjs";
import type { IGameScreenView } from "../views/IGameScreenView";

/**
 * Step 1 has no game state to route — the controller is a placeholder
 * so the registered screen has its required controller pair, and
 * later steps slot score / level / undo wiring in here.
 */
export class GameScreenViewController implements IViewController<IGameScreenView> {
  public inject(_resolver: IInstanceResolver): void {}

  public initialize(_view: IGameScreenView): void {}

  public destroy(): void {}
}
