export const AssetTypes = {
  HudTexture: "HudTexture",
  WorldTexture: "WorldTexture",
  GLTF: "GLTF",
} as const;

export type AssetType = (typeof AssetTypes)[keyof typeof AssetTypes];

