import { AssetRequest } from "../../../core/assets/AssetRequest.js";
import { AssetTypes } from "../../../core/assets/AssetTypes.js";

const backgroundUrl = new URL("./assets/levelprogress/background.jpg", import.meta.url).href;
const backButtonBgUrl = new URL("./assets/levelprogress/back_button_bg.png", import.meta.url).href;
const levelItemBgUrl = new URL("./assets/levelprogress/level_item_bg.png", import.meta.url).href;

export const LevelProgressScreenAssets = {
  BackButtonBg: new AssetRequest(AssetTypes.HudTexture, "LevelProgressScreen.BackButtonBg", backButtonBgUrl),
  LevelItemBg: new AssetRequest(AssetTypes.HudTexture, "LevelProgressScreen.LevelItemBg", levelItemBgUrl),
  Background: new AssetRequest(AssetTypes.HudTexture, "LevelProgressScreen.Background", backgroundUrl)
} as const;

