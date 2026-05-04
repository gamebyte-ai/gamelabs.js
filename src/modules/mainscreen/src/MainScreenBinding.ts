import { ModuleBinding } from "../../../core/ModuleBinding.js";
import type { DIContainer } from "../../../core/di/DIContainer.js";
import type { IInstanceResolver } from "../../../core/di/IInstanceResolver.js";
import type { ViewFactory } from "../../../core/views/ViewFactory.js";

import { AssetRequest } from "../../../core/assets/AssetRequest.js";
import { AssetTypes } from "../../../core/assets/AssetTypes.js";

import { MainScreenViewController } from "./controllers/MainScreenViewController.js";
import { MainScreenEvents } from "./events/MainScreenEvents.js";
import { MainScreenView } from "./views/MainScreenView.pixi.js";
import { MainScreenAssetIds } from "./MainScreenAssetIds.js";
import { MainScreenUIIds } from "./MainScreenUIIds.js";

export class MainScreenBinding extends ModuleBinding {
  //  FIELDS
  private _backgroundPreset = '{"bgTextureId":"MainScreen.Background"}';
  private _playButtonPreset = '{"width":400,"height":200,"skin":{"idle":"MainScreen.PlayButtonBg"}}';
  private _settingsButtonPreset =
    '{"width":400,"height":100,"label":"SETTINGS","labelStyle":{"fontSize":24,"fontWeight":"800","letterSpacing":1.5},"skin":{"idle":"MainScreen.SettingsButtonBg"}}';
  private _buttonsColPreset = '{"width":400,"gap":18}';

  //  CONSTRUCTORS
  constructor() {
    super();

    const isSourceModule = import.meta.url.includes("/src/modules/mainscreen/src/");
    this._assetRequestList.addRequest(
      new AssetRequest(
        AssetTypes.HudTexture,
        MainScreenAssetIds.Background,
        new URL(isSourceModule ? "../assets/background.jpg" : "./assets/mainscreen/background.jpg", import.meta.url).href,
      ),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(
        AssetTypes.HudTexture,
        MainScreenAssetIds.Logo,
        new URL(isSourceModule ? "../assets/logo.png" : "./assets/mainscreen/logo.png", import.meta.url).href,
      ),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(
        AssetTypes.HudTexture,
        MainScreenAssetIds.PlayButtonBg,
        new URL(isSourceModule ? "../assets/play_button_bg.png" : "./assets/mainscreen/play_button_bg.png", import.meta.url).href,
      ),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(
        AssetTypes.HudTexture,
        MainScreenAssetIds.SettingsButtonBg,
        new URL(isSourceModule ? "../assets/settings_button_bg.png" : "./assets/mainscreen/settings_button_bg.png", import.meta.url).href,
      ),
    );
    this._assetRequestList.addRequest(new AssetRequest(AssetTypes.Text, MainScreenAssetIds.BackgroundPreset, "", this._backgroundPreset));
    this._assetRequestList.addRequest(new AssetRequest(AssetTypes.Text, MainScreenAssetIds.PlayButtonPreset, "", this._playButtonPreset));
    this._assetRequestList.addRequest(
      new AssetRequest(AssetTypes.Text, MainScreenAssetIds.SettingsButtonPreset, "", this._settingsButtonPreset),
    );
    this._assetRequestList.addRequest(new AssetRequest(AssetTypes.Text, MainScreenAssetIds.ButtonsColPreset, "", this._buttonsColPreset));
  }

  //  METHODS
  public configureDI(diContainer: DIContainer, _viewDiContainer: DIContainer): void {
    diContainer.bindInstance(MainScreenEvents, new MainScreenEvents());
  }

  public configureViews(viewFactory: ViewFactory<IInstanceResolver>): void {
    viewFactory.registerScreen(MainScreenUIIds.MainScreen, MainScreenView, MainScreenViewController);
  }
}
