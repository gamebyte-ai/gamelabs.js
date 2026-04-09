import { ModuleBinding } from "../../../core/ModuleBinding.js";
import type { DIContainer } from "../../../core/di/DIContainer.js";
import type { IInstanceResolver } from "../../../core/di/IInstanceResolver.js";
import type { ViewFactory } from "../../../core/views/ViewFactory.js";

import { OnScreenControlManager } from "./utilities/OnScreenControlManager.js";
import { OnScreenControlEvents } from "./events/OnScreenControlEvents.js";
import { OnScreenControlsView } from "./views/OnScreenControlsView.pixi.js";
import { OnScreenControlsViewController } from "./controllers/OnScreenControlsViewController.js";
import type { ControlConfig } from "./OnScreenControlTypes.js";

export class OnScreenControlsBinding extends ModuleBinding {
  //  FIELDS
  private readonly _manager = new OnScreenControlManager();

  //  GETTERS
  public get manager(): OnScreenControlManager {
    return this._manager;
  }

  //  METHODS
  /** Add a control (button or joystick) to the manager. Can be called before or after initialization. */
  public addControl(config: ControlConfig): void {
    this._manager.addControl(config);
  }

  /** Remove a control by id. Can be called at any time. */
  public removeControl(id: string): void {
    this._manager.removeControl(id);
  }

  public configureDI(diContainer: DIContainer, _viewDiContainer: DIContainer): void {
    diContainer.bindInstance(OnScreenControlManager, this._manager);
    diContainer.bindInstance(OnScreenControlEvents, this._manager.events);
  }

  public configureViews(viewFactory: ViewFactory<IInstanceResolver>): void {
    viewFactory.register(OnScreenControlsView, OnScreenControlsViewController);
  }
}
