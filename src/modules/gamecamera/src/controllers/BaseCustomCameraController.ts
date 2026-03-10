import type { GameCameraManager } from "../GameCameraManager.js";
import { GameCameraMode } from "../GameCameraMode.js";
import { BaseCameraController } from "./BaseCameraController.js";

/**
 * Abstract base for custom camera controller implementations.
 * Extend this class and override applyPositionToCamera and getFocusFromOrthoPosition
 * to implement your own camera behavior.
 */
export abstract class BaseCustomCameraController extends BaseCameraController {
  protected constructor(manager: GameCameraManager) {
    super(manager, GameCameraMode.Custom);
  }
}
