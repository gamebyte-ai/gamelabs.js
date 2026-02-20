import { AssetLoader } from "../../../core/assets/AssetLoader.js";
import { IModuleBinding } from "../../../core/IModuleBinding.js";
import type { DIContainer } from "../../../core/di/DIContainer.js";
import type { IInstanceResolver } from "../../../core/di/IInstanceResolver.js";
import type { ViewFactory } from "../../../core/views/ViewFactory.js";

import { MainScreenController } from "./controllers/MainScreenController.js";
import { MainScreenEvents } from "./events/MainScreenEvents.js";
import { MainScreenView } from "./views/MainScreenView.pixi.js";
import { MainScreenAssets } from "./MainScreenAssets.js";

export class MainScreenBinding extends IModuleBinding {
  static readonly PlayButtonBg     = MainScreenAssets.PlayButtonBg;
  static readonly SettingsButtonBg = MainScreenAssets.SettingsButtonBg;
  static readonly Background       = MainScreenAssets.Background;

  public configureDI(diContainer: DIContainer): void {
    diContainer.bindInstance(MainScreenEvents, new MainScreenEvents());
  }

  public configureViews(viewFactory: ViewFactory<IInstanceResolver>): void {
    viewFactory.registerHudView<MainScreenView, MainScreenController>(MainScreenView, {
      Controller: MainScreenController
    });
  }

  public loadAssets(assetLoader: AssetLoader): void {
    void assetLoader.load(MainScreenAssets.PlayButtonBg);
    void assetLoader.load(MainScreenAssets.SettingsButtonBg);
    void assetLoader.load(MainScreenAssets.Background);
  }
}

