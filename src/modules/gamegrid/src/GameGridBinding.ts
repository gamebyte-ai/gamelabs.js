import { ModuleBinding } from "../../../core/ModuleBinding.js";
import type { DIContainer } from "../../../core/di/DIContainer.js";
import type { IInstanceResolver } from "../../../core/di/IInstanceResolver.js";
import type { ViewFactory } from "../../../core/views/ViewFactory.js";
import { GameGridModel } from "./models/GameGridModel.js";
import { GameGridEvents } from "./events/GameGridEvents.js";
import { GameGridController } from "./controllers/GameGridController.js";
import { GameGridView } from "./views/GameGridView.three.js";
import { GameGridObjectCreator } from "./views/GameGridObjectCreator.js";

export class GameGridBinding extends ModuleBinding {
  private readonly _events = new GameGridEvents();
  private readonly _model = new GameGridModel(this._events);
  private readonly _objectCreator: GameGridObjectCreator;
  private readonly _viewClass: typeof GameGridView;
  private readonly _controllerClass: typeof GameGridController;

  public constructor(objectCreator: GameGridObjectCreator | null = null, viewClass: typeof GameGridView | null = null, controllerClass: typeof GameGridController | null = null) {
    super();
    this._objectCreator = objectCreator ?? new GameGridObjectCreator();
    this._viewClass = viewClass ?? GameGridView;
    this._controllerClass = controllerClass ?? GameGridController;
  }

  public configureDI(diContainer: DIContainer, viewDiContainer: DIContainer): void {
    diContainer.bindInstance(GameGridEvents, this._events);
    diContainer.bindInstance(GameGridModel, this._model);
    viewDiContainer.bindInstance(GameGridObjectCreator, this._objectCreator);
  }

  public configureViews(viewFactory: ViewFactory<IInstanceResolver>): void {
    viewFactory.registerWorldView(this._viewClass, { Controller: this._controllerClass });
  }

  public get model(): GameGridModel {
    return this._model;
  }

  public get events(): GameGridEvents {
    return this._events;
  }
}
