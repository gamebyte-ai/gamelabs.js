import { AssetRequest } from "../../../core/assets/AssetRequest.js";
import { AssetTypes } from "../../../core/assets/AssetTypes.js";

const backgroundUrl = new URL("./assets/mainscreen/background.jpg", import.meta.url).href;
const playButtonBgUrl = new URL("./assets/mainscreen/play_button_bg.png", import.meta.url).href;
const settingsButtonBgUrl = new URL("./assets/mainscreen/settings_button_bg.png", import.meta.url).href;


export const MainScreenAssets = {
  PlayButtonBg: new AssetRequest(AssetTypes.HudTexture, "MainScreen.PlayButtonBg", playButtonBgUrl),
  SettingsButtonBg: new AssetRequest(AssetTypes.HudTexture, "MainScreen.SettingsButtonBg", settingsButtonBgUrl),
  Background: new AssetRequest(AssetTypes.HudTexture, "MainScreen.Background", backgroundUrl)
} as const;

