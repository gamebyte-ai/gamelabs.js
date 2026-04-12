import type { GameCameraManager } from "../utilities/GameCameraManager.js";
import type { GameCameraMode } from "../constants/GameCameraMode.js";
import { BaseCameraController } from "./BaseCameraController.js";

export abstract class IsometricBaseCameraController extends BaseCameraController {
  protected constructor(manager: GameCameraManager, mode: GameCameraMode.Isometric2d | GameCameraMode.Isometric3d) {
    super(manager, mode);
  }

  public abstract move(x: number, yOrZ: number, z?: number): void;
}
