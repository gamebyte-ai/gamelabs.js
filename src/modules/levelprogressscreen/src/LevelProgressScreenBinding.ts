import { ModuleBinding } from "../../../core/ModuleBinding.js";
import type { DIContainer } from "../../../core/di/DIContainer.js";
import type { IInstanceResolver } from "../../../core/di/IInstanceResolver.js";
import type { ViewFactory } from "../../../core/views/ViewFactory.js";

import { LevelProgressScreenController } from "./controllers/LevelProgressScreenController.js";
import { LevelProgressScreenEvents } from "./events/LevelProgressScreenEvents.js";
import {
  ILevelProgressScreenModel,
  type ILevelProgressScreenModel as LevelProgressScreenModel,
} from "./models/ILevelProgressScreenModel.js";
import { LevelProgressScreenAssetIds } from "./LevelProgressScreenAssetIds.js";
import { LevelProgressScreenView } from "./views/LevelProgressScreenView.pixi.js";
import { LevelProgressScreenUIIds } from "./LevelProgressScreenUIIds.js";
import { AssetRequest } from "../../../core/assets/AssetRequest.js";
import { AssetTypes } from "../../../core/assets/AssetTypes.js";

export class LevelProgressScreenBinding extends ModuleBinding {
  //  FIELDS
  private readonly model: LevelProgressScreenModel | undefined;
  private _backgroundPreset = '{"bgTextureId":"LevelProgressScreen.Background"}';
  private _backButtonPreset =
    '{"width":220,"height":88,"label":"BACK","labelStyle":{"fontSize":16,"fontWeight":"800","letterSpacing":1},"fillColor":725536,"fillAlpha":0.75,"bgTextureId":"LevelProgressScreen.BackButtonBg"}';
  private _levelsColPreset = '{"gap":18}';

  //  METHODS
  public constructor(model?: LevelProgressScreenModel) {
    super();
    this.model = model;

    const isSourceModule = import.meta.url.includes("/src/modules/levelprogressscreen/src/");
    this._assetRequestList.addRequest(
      new AssetRequest(
        AssetTypes.HudTexture,
        LevelProgressScreenAssetIds.Background,
        new URL(isSourceModule ? "../assets/background.jpg" : "./assets/levelprogress/background.jpg", import.meta.url)
          .href,
      ),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(
        AssetTypes.HudTexture,
        LevelProgressScreenAssetIds.BackButtonBg,
        new URL(
          isSourceModule ? "../assets/back_button_bg.png" : "./assets/levelprogress/back_button_bg.png",
          import.meta.url,
        ).href,
      ),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(
        AssetTypes.HudTexture,
        LevelProgressScreenAssetIds.LevelItemBg,
        new URL(
          isSourceModule ? "../assets/level_item_bg.png" : "./assets/levelprogress/level_item_bg.png",
          import.meta.url,
        ).href,
      ),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(
        AssetTypes.HudTexture,
        LevelProgressScreenAssetIds.Connector,
        new URL(isSourceModule ? "../assets/connector.png" : "./assets/levelprogress/connector.png", import.meta.url)
          .href,
      ),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(AssetTypes.Text, LevelProgressScreenAssetIds.BackgroundPreset, "", this._backgroundPreset),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(AssetTypes.Text, LevelProgressScreenAssetIds.BackButtonPreset, "", this._backButtonPreset),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(AssetTypes.Text, LevelProgressScreenAssetIds.LevelsColPreset, "", this._levelsColPreset),
    );
  }

  public configureDI(diContainer: DIContainer, viewDiContainer: DIContainer): void {
    diContainer.bindInstance(LevelProgressScreenEvents, new LevelProgressScreenEvents());
    if (this.model) diContainer.bindInstance(ILevelProgressScreenModel, this.model);
  }

  public configureViews(viewFactory: ViewFactory<IInstanceResolver>): void {
    viewFactory.registerScreen(
      LevelProgressScreenUIIds.LevelProgressScreen,
      LevelProgressScreenView,
      LevelProgressScreenController,
    );
  }
}
