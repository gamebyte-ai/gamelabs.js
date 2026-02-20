import { AssetRequest } from "../../../core/assets/AssetRequest.js";
import { AssetTypes } from "../../../core/assets/AssetTypes.js";

const backgroundUrl = new URL("./assets/levelprogress/background.jpg", import.meta.url).href;

export const LevelProgressScreenAssets = {
  Background: new AssetRequest(AssetTypes.HudTexture, "LevelProgressScreen.Background", backgroundUrl)
} as const;

