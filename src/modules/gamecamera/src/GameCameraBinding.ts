import { ModuleBinding } from "../../../core/ModuleBinding.js";
import type { DIContainer } from "../../../core/di/DIContainer.js";

import { GameCameraManager } from "./utilities/GameCameraManager.js";

export class GameCameraBinding extends ModuleBinding {
  public configureDI(diContainer: DIContainer, _viewDiContainer: DIContainer): void {
    diContainer.bindInstance(GameCameraManager, new GameCameraManager());
  }
}
