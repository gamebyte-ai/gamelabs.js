import { ModuleBinding } from "../../../core/ModuleBinding.js";
import type { DIContainer } from "../../../core/di/DIContainer.js";
import type { IInstanceResolver } from "../../../core/di/IInstanceResolver.js";
import type { ViewFactory } from "../../../core/views/ViewFactory.js";
import { GameGridModel } from "./models/GameGridModel.js";
import { GameGridEvents } from "./events/GameGridEvents.js";
import { GameGridController } from "./controllers/GameGridController.js";
import { GameGridView } from "./views/GameGridView.three.js";

export class GameGridBinding extends ModuleBinding {
  private readonly _events = new GameGridEvents();
  private readonly _model = new GameGridModel(this._events);

  public configureDI(diContainer: DIContainer, viewDiContainer: DIContainer): void {
    diContainer.bindInstance(GameGridEvents, this._events);
    diContainer.bindInstance(GameGridModel, this._model);
  }

  public configureViews(viewFactory: ViewFactory<IInstanceResolver>): void {
    viewFactory.registerWorldView<GameGridView, GameGridController>(GameGridView, { Controller: GameGridController });
  }

  public get model(): GameGridModel {
    return this._model;
  }

  public get events(): GameGridEvents {
    return this._events;
  }
}
