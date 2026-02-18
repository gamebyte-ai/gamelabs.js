import { AssetRequest, AssetTypes } from "gamelabsjs";

import backgroundUrl from "./assets/background.jpg?url";
import playButtonBgUrl from "./assets/play_button_bg.png?url";
import settingsButtonBgUrl from "./assets/settings_button_bg.png?url";

export const MainScreenAssets = {
  PlayButtonBg: new AssetRequest(AssetTypes.HudTexture, "MainScreen.PlayButtonBg", playButtonBgUrl),
  SettingsButtonBg: new AssetRequest(AssetTypes.HudTexture, "MainScreen.SettingsButtonBg", settingsButtonBgUrl),
  Background: new AssetRequest(AssetTypes.HudTexture, "MainScreen.Background", backgroundUrl)
} as const;

