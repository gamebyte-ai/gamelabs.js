export const AssetTypes = {
  HudTexture: "HudTexture",
  WorldTexture: "WorldTexture",
  GLTF: "GLTF",
  Text: "Text",
} as const;

export type AssetType = (typeof AssetTypes)[keyof typeof AssetTypes];

