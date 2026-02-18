import { AssetLoader, AssetRequest, AssetTypes, IModuleBinding } from "gamelabsjs";
import type { DIContainer, IInstanceResolver, ViewFactory } from "gamelabsjs";

import { MainScreenController } from "./controllers/MainScreenController.js";
import { MainScreenEvents } from "./events/MainScreenEvents.js";
import { MainScreenView } from "./views/MainScreenView.pixi.js";
import { MainScreenAssets } from "./MainScreenAssets.js";

export class MainScreenBinding extends IModuleBinding {
  static readonly PlayButtonBg     = MainScreenAssets.PlayButtonBg;
  static readonly SettingsButtonBg = MainScreenAssets.SettingsButtonBg;
  static readonly Background       = MainScreenAssets.Background;

  configureDI(diContainer: DIContainer): void {
    diContainer.bindInstance(MainScreenEvents, new MainScreenEvents());
  
  }
  configureViews(viewFactory: ViewFactory<IInstanceResolver>): void {
    viewFactory.registerHudView<MainScreenView, MainScreenController>(MainScreenView, {
      Controller: MainScreenController
    });
  }

  loadAssets(assetLoader: AssetLoader): void{
    void assetLoader.load(MainScreenAssets.PlayButtonBg);
    void assetLoader.load(MainScreenAssets.SettingsButtonBg);
    void assetLoader.load(MainScreenAssets.Background);
  }
}

