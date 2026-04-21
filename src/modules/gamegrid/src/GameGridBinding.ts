import { ModuleBinding } from "../../../core/ModuleBinding.js";
import type { DIContainer } from "../../../core/di/DIContainer.js";
import type { IInstanceResolver } from "../../../core/di/IInstanceResolver.js";
import type { ViewFactory } from "../../../core/views/ViewFactory.js";
import { GridsModel } from "./models/GridsModel.js";
import { IGridsModel } from "./models/IGridsModel.js";
import { GridEvents } from "./events/GridEvents.js";
import { GridsViewController } from "./controllers/GridsViewController.js";
import { GridsView } from "./views/GridsView.three.js";
import { GridObjectCreator } from "./views/GridObjectCreator.js";

export class GameGridBinding extends ModuleBinding {
  private readonly _objectCreator: GridObjectCreator;
  private readonly _viewClass: typeof GridsView;
  private readonly _controllerClass: typeof GridsViewController;

  public constructor(
    objectCreator: GridObjectCreator | null = null,
    viewClass: typeof GridsView | null = null,
    controllerClass: typeof GridsViewController | null = null,
  ) {
    super();
    this._objectCreator = objectCreator ?? new GridObjectCreator();
    this._viewClass = viewClass ?? GridsView;
    this._controllerClass = controllerClass ?? GridsViewController;
  }

  public configureDI(diContainer: DIContainer, viewDiContainer: DIContainer): void {
    diContainer.bindInstance(GridEvents, new GridEvents());
    // GridsModel is an IInjectionTarget — resolves GridEvents via inject().
    diContainer.bindSingleton(GridsModel, () => new GridsModel(), [IGridsModel]);
    viewDiContainer.bindInstance(GridObjectCreator, this._objectCreator);
  }

  public configureViews(viewFactory: ViewFactory<IInstanceResolver>): void {
    viewFactory.register(this._viewClass, this._controllerClass);
  }
}
