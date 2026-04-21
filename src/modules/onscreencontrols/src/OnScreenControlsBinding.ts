import { ModuleBinding } from "../../../core/ModuleBinding.js";
import type { DIContainer } from "../../../core/di/DIContainer.js";
import type { IInstanceResolver } from "../../../core/di/IInstanceResolver.js";
import type { ViewFactory } from "../../../core/views/ViewFactory.js";

import { OnScreenControlManager } from "./utilities/OnScreenControlManager.js";
import { OnScreenControlEvents } from "./events/OnScreenControlEvents.js";
import { OnScreenControlsView } from "./views/OnScreenControlsView.pixi.js";
import { OnScreenControlsViewController } from "./controllers/OnScreenControlsViewController.js";

export class OnScreenControlsBinding extends ModuleBinding {
  public configureDI(diContainer: DIContainer, _viewDiContainer: DIContainer): void {
    const manager = new OnScreenControlManager();
    diContainer.bindInstance(OnScreenControlManager, manager);
    diContainer.bindInstance(OnScreenControlEvents, manager.events);
  }

  public configureViews(viewFactory: ViewFactory<IInstanceResolver>): void {
    viewFactory.register(OnScreenControlsView, OnScreenControlsViewController);
  }
}
