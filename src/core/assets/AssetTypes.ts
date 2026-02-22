export const AssetTypes = {
  HudTexture: "HudTexture",
  GLTF: "GLTF",
} as const;

export type AssetType = (typeof AssetTypes)[keyof typeof AssetTypes];

