import { ModuleBinding } from "../../../core/ModuleBinding.js";
import type { DIContainer } from "../../../core/di/DIContainer.js";
import type { IInstanceResolver } from "../../../core/di/IInstanceResolver.js";
import type { ViewFactory } from "../../../core/views/ViewFactory.js";
import { GridEvents } from "./grid/events/GridEvents.js";
import { GridsModel } from "./grid/models/GridsModel.js";
import { IGridsModel } from "./grid/models/IGridsModel.js";
import { GridsViewController } from "./grid/controllers/GridsViewController.js";
import { GridsView } from "./grid/views/GridsView.three.js";
import { GridObjectCreator } from "./grid/views/GridObjectCreator.js";

/**
 * Module binding for the gamegrid module.
 *
 * Binds the shape-agnostic {@link GridEvents} and {@link GridsModel}
 * (with {@link IGridsModel} alias) into the app DI container — both
 * `RectGrid` and `HexGrid` instances are stored and emitted through the
 * same channels. Also binds the rect-grid view layer (`GridObjectCreator`
 * in the view container, `GridsView` + `GridsViewController` registered
 * with the view factory). Hex grids have no shared visual contract yet
 * and must be rendered by app-specific code.
 */
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
