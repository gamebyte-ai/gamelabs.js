import { AssetRequest } from "../../../core/assets/AssetRequest.js";
import { AssetTypes } from "../../../core/assets/AssetTypes.js";

const isSourceModule = import.meta.url.includes("/src/modules/levelprogressscreeen/src/");
const backgroundUrl = new URL(isSourceModule ? "../assets/background.jpg" : "./assets/levelprogress/background.jpg", import.meta.url).href;
const backButtonBgUrl = new URL(isSourceModule ? "../assets/back_button_bg.png" : "./assets/levelprogress/back_button_bg.png", import.meta.url).href;
const levelItemBgUrl = new URL(isSourceModule ? "../assets/level_item_bg.png" : "./assets/levelprogress/level_item_bg.png", import.meta.url).href;

export const LevelProgressScreenAssets = {
  BackButtonBg: new AssetRequest(AssetTypes.HudTexture, "LevelProgressScreen.BackButtonBg", backButtonBgUrl),
  LevelItemBg: new AssetRequest(AssetTypes.HudTexture, "LevelProgressScreen.LevelItemBg", levelItemBgUrl),
  Background: new AssetRequest(AssetTypes.HudTexture, "LevelProgressScreen.Background", backgroundUrl)
} as const;

