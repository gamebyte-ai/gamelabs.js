export type GameCameraMode = "platformer2d" | "topdown2d" | "isometric2d" | "isometric3d";

export const GameCameraModes: Record<GameCameraMode, GameCameraMode> = {
  platformer2d: "platformer2d",
  topdown2d: "topdown2d",
  isometric2d: "isometric2d",
  isometric3d: "isometric3d"
} as const;
