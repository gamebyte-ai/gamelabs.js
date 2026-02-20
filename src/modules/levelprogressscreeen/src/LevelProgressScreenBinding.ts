import { AssetLoader } from "../../../core/assets/AssetLoader.js";
import { IModuleBinding } from "../../../core/IModuleBinding.js";
import type { DIContainer } from "../../../core/di/DIContainer.js";
import type { IInstanceResolver } from "../../../core/di/IInstanceResolver.js";
import type { ViewFactory } from "../../../core/views/ViewFactory.js";

import { LevelProgressScreenController } from "./controllers/LevelProgressScreenController.js";
import { LevelProgressScreenEvents } from "./events/LevelProgressScreenEvents.js";
import { ILevelProgressScreenModel, type ILevelProgressScreenModel as LevelProgressScreenModel } from "./models/ILevelProgressScreenModel.js";
import { LevelProgressScreenAssets } from "./LevelProgressScreenAssets.js";
import { LevelProgressScreenView } from "./views/LevelProgressScreenView.pixi.js";

export class LevelProgressScreenBinding extends IModuleBinding {
  static readonly Background = LevelProgressScreenAssets.Background;

  private readonly model: LevelProgressScreenModel | undefined;

  public constructor(model?: LevelProgressScreenModel) {
    super();
    this.model = model;
  }

  public configureDI(diContainer: DIContainer): void {
    diContainer.bindInstance(LevelProgressScreenEvents, new LevelProgressScreenEvents());
    if (this.model) diContainer.bindInstance(ILevelProgressScreenModel, this.model);
  }

  public configureViews(viewFactory: ViewFactory<IInstanceResolver>): void {
    viewFactory.registerHudView<LevelProgressScreenView, LevelProgressScreenController>(LevelProgressScreenView, {Controller: LevelProgressScreenController});
  }

  public loadAssets(assetLoader: AssetLoader): void {
    void assetLoader.load(LevelProgressScreenAssets.Background);
  }
}

