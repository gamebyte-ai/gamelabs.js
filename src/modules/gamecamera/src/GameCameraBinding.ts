import { ModuleBinding } from "../../../core/ModuleBinding.js";
import type { DIContainer } from "../../../core/di/DIContainer.js";

import { GameCameraManager } from "./GameCameraManager.js";

export class GameCameraBinding extends ModuleBinding {
  private readonly _cameraManager = new GameCameraManager();

  public configureDI(diContainer: DIContainer, _viewDiContainer: DIContainer): void {
    diContainer.bindInstance(GameCameraManager, this._cameraManager);
  }

  public get cameraManager(): GameCameraManager {
    return this._cameraManager;
  }
}
