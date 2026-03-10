import type { Camera, Vector3 } from "three";
import type { GameCameraMode } from "../GameCameraMode.js";

export type ICameraController = {
  readonly isOrtho: boolean;
  getMode(): GameCameraMode;
  applyPositionToCamera(camera: Camera, focus: Vector3, orthoSize: number): void;
  getFocusFromOrthoPosition(orthoPos: Vector3, orthoSize: number): Vector3;
};
