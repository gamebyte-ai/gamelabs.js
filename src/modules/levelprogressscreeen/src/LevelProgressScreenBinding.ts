import { ModuleBinding } from "../../../core/ModuleBinding.js";
import type { DIContainer } from "../../../core/di/DIContainer.js";
import type { IInstanceResolver } from "../../../core/di/IInstanceResolver.js";
import type { ViewFactory } from "../../../core/views/ViewFactory.js";

import { LevelProgressScreenController } from "./controllers/LevelProgressScreenController.js";
import { LevelProgressScreenEvents } from "./events/LevelProgressScreenEvents.js";
import { ILevelProgressScreenModel, type ILevelProgressScreenModel as LevelProgressScreenModel } from "./models/ILevelProgressScreenModel.js";
import { LevelProgressScreenAssetIds } from "./LevelProgressScreenAssets.js";
import { LevelProgressScreenView } from "./views/LevelProgressScreenView.pixi.js";
import { AssetRequest } from "../../../core/assets/AssetRequest.js";
import { AssetTypes } from "../../../core/assets/AssetTypes.js";

export class LevelProgressScreenBinding extends ModuleBinding {

  private readonly model: LevelProgressScreenModel | undefined;

  public constructor(model?: LevelProgressScreenModel) {
    super();
    this.model = model;

    const isSourceModule = import.meta.url.includes("/src/modules/levelprogressscreeen/src/");
    this._assets.set(LevelProgressScreenAssetIds.Background,   new AssetRequest(AssetTypes.HudTexture, LevelProgressScreenAssetIds.Background,   new URL(isSourceModule ? "../assets/background.jpg" :     "./assets/levelprogress/background.jpg",     import.meta.url).href));
    this._assets.set(LevelProgressScreenAssetIds.BackButtonBg, new AssetRequest(AssetTypes.HudTexture, LevelProgressScreenAssetIds.BackButtonBg, new URL(isSourceModule ? "../assets/back_button_bg.png" : "./assets/levelprogress/back_button_bg.png", import.meta.url).href));
    this._assets.set(LevelProgressScreenAssetIds.LevelItemBg,  new AssetRequest(AssetTypes.HudTexture, LevelProgressScreenAssetIds.LevelItemBg,  new URL(isSourceModule ? "../assets/level_item_bg.png" :  "./assets/levelprogress/level_item_bg.png",  import.meta.url).href));
  }

  public configureDI(diContainer: DIContainer): void {
    diContainer.bindInstance(LevelProgressScreenEvents, new LevelProgressScreenEvents());
    if (this.model) diContainer.bindInstance(ILevelProgressScreenModel, this.model);
  }

  public configureViews(viewFactory: ViewFactory<IInstanceResolver>): void {
    viewFactory.registerHudView<LevelProgressScreenView, LevelProgressScreenController>(LevelProgressScreenView, {Controller: LevelProgressScreenController});
  }

}
