export const AssetTypes = {
  HudTexture: "HudTexture",
} as const;

export type AssetType = (typeof AssetTypes)[keyof typeof AssetTypes];

