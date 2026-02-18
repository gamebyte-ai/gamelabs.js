import { AssetLoader, IModuleBinding } from "gamelabsjs";
import type { DIContainer, IInstanceResolver, ViewFactory } from "gamelabsjs";

import { LevelProgressScreenController } from "./controllers/LevelProgressScreenController.js";
import { LevelProgressScreenEvents } from "./events/LevelProgressScreenEvents.js";
import { ILevelProgressScreenModel, type ILevelProgressScreenModel as LevelProgressScreenModel } from "./models/ILevelProgressScreenModel.js";
import { LevelProgressScreenView } from "./views/LevelProgressScreenView.pixi.js";

export class LevelProgressScreenBinding extends IModuleBinding {
  private readonly model: LevelProgressScreenModel | undefined;

  constructor(model?: LevelProgressScreenModel) {
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

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public loadAssets(_assetLoader: AssetLoader): void {}
}

