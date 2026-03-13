import { ModuleBinding } from "../../../core/ModuleBinding.js";
import type { DIContainer } from "../../../core/di/DIContainer.js";
import type { IInstanceResolver } from "../../../core/di/IInstanceResolver.js";
import type { ViewFactory } from "../../../core/views/ViewFactory.js";

import { AssetRequest } from "../../../core/assets/AssetRequest.js";
import { AssetTypes } from "../../../core/assets/AssetTypes.js";

import { MainScreenController } from "./controllers/MainScreenController.js";
import { MainScreenEvents } from "./events/MainScreenEvents.js";
import { MainScreenView } from "./views/MainScreenView.pixi.js";
import { MainScreenAssetIds } from "./MainScreenAssetIds.js";

export class MainScreenBinding extends ModuleBinding {
  //  CONSTRUCTORS
  constructor(){
    super();

    const isSourceModule = import.meta.url.includes("/src/modules/mainscreen/src/");
    this._assetRequestList.addRequest(new AssetRequest(AssetTypes.HudTexture, MainScreenAssetIds.Background,       new URL(isSourceModule ? "../assets/background.jpg" :         "./assets/mainscreen/background.jpg",         import.meta.url).href));
    this._assetRequestList.addRequest(new AssetRequest(AssetTypes.HudTexture, MainScreenAssetIds.Logo,             new URL(isSourceModule ? "../assets/logo.png" :               "./assets/mainscreen/logo.png",               import.meta.url).href));
    this._assetRequestList.addRequest(new AssetRequest(AssetTypes.HudTexture, MainScreenAssetIds.PlayButtonBg,     new URL(isSourceModule ? "../assets/play_button_bg.png" :     "./assets/mainscreen/play_button_bg.png",     import.meta.url).href));
    this._assetRequestList.addRequest(new AssetRequest(AssetTypes.HudTexture, MainScreenAssetIds.SettingsButtonBg, new URL(isSourceModule ? "../assets/settings_button_bg.png" : "./assets/mainscreen/settings_button_bg.png", import.meta.url).href));
  }

  //  METHODS
  public configureDI(diContainer: DIContainer, viewDiContainer: DIContainer): void {
    diContainer.bindInstance(MainScreenEvents, new MainScreenEvents());
  }

  public configureViews(viewFactory: ViewFactory<IInstanceResolver>): void {
    viewFactory.registerHudView<MainScreenView, MainScreenController>(MainScreenView, {
      Controller: MainScreenController
    });
  }

}

