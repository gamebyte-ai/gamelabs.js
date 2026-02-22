import { AssetRequest } from "../../../core/assets/AssetRequest.js";
import { AssetTypes } from "../../../core/assets/AssetTypes.js";

const isSourceModule = import.meta.url.includes("/src/modules/mainscreen/src/");
const backgroundUrl = new URL(isSourceModule ? "../assets/background.jpg" : "./assets/mainscreen/background.jpg", import.meta.url).href;
const playButtonBgUrl = new URL(isSourceModule ? "../assets/play_button_bg.png" : "./assets/mainscreen/play_button_bg.png", import.meta.url).href;
const settingsButtonBgUrl = new URL(isSourceModule ? "../assets/settings_button_bg.png" : "./assets/mainscreen/settings_button_bg.png", import.meta.url).href;


export const MainScreenAssets = {
  PlayButtonBg: new AssetRequest(AssetTypes.HudTexture, "MainScreen.PlayButtonBg", playButtonBgUrl),
  SettingsButtonBg: new AssetRequest(AssetTypes.HudTexture, "MainScreen.SettingsButtonBg", settingsButtonBgUrl),
  Background: new AssetRequest(AssetTypes.HudTexture, "MainScreen.Background", backgroundUrl)
} as const;

