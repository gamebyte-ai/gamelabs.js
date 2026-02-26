import { ModuleBinding } from "../../../core/ModuleBinding.js";
import type { DIContainer } from "../../../core/di/DIContainer.js";
import type { IInstanceResolver } from "../../../core/di/IInstanceResolver.js";
import type { ViewFactory } from "../../../core/views/ViewFactory.js";

import { AssetRequest } from "../../../core/assets/AssetRequest.js";
import { AssetTypes } from "../../../core/assets/AssetTypes.js";

import { MainScreenController } from "./controllers/MainScreenController.js";
import { MainScreenEvents } from "./events/MainScreenEvents.js";
import { MainScreenView } from "./views/MainScreenView.pixi.js";
import { MainScreenAssetIds } from "./MainScreenAssets.js";

export class MainScreenBinding extends ModuleBinding {

  constructor(){
    super();

    const isSourceModule = import.meta.url.includes("/src/modules/mainscreen/src/");
    this._assets.set(MainScreenAssetIds.Background,       new AssetRequest(AssetTypes.HudTexture, MainScreenAssetIds.Background,       new URL(isSourceModule ? "../assets/background.jpg" :         "./assets/mainscreen/background.jpg",         import.meta.url).href));
    this._assets.set(MainScreenAssetIds.Logo,             new AssetRequest(AssetTypes.HudTexture, MainScreenAssetIds.Logo,             new URL(isSourceModule ? "../assets/logo.png" :               "./assets/mainscreen/logo.png",               import.meta.url).href));
    this._assets.set(MainScreenAssetIds.PlayButtonBg,     new AssetRequest(AssetTypes.HudTexture, MainScreenAssetIds.PlayButtonBg,     new URL(isSourceModule ? "../assets/play_button_bg.png" :     "./assets/mainscreen/play_button_bg.png",     import.meta.url).href));
    this._assets.set(MainScreenAssetIds.SettingsButtonBg, new AssetRequest(AssetTypes.HudTexture, MainScreenAssetIds.SettingsButtonBg, new URL(isSourceModule ? "../assets/settings_button_bg.png" : "./assets/mainscreen/settings_button_bg.png", import.meta.url).href));
  }

  public configureDI(diContainer: DIContainer): void {
    diContainer.bindInstance(MainScreenEvents, new MainScreenEvents());
  }

  public configureViews(viewFactory: ViewFactory<IInstanceResolver>): void {
    viewFactory.registerHudView<MainScreenView, MainScreenController>(MainScreenView, {
      Controller: MainScreenController
    });
  }

}

