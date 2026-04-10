export const AssetTypes = {
  HudTexture: "HudTexture",
  WorldTexture: "WorldTexture",
  GLTF: "GLTF",
  Text: "Text",
  Audio: "Audio",
} as const;

export type AssetType = (typeof AssetTypes)[keyof typeof AssetTypes];
