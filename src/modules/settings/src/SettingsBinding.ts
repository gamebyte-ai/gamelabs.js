import { ModuleBinding } from "../../../core/ModuleBinding.js";
import type { DIContainer } from "../../../core/di/DIContainer.js";
import type { IInstanceResolver } from "../../../core/di/IInstanceResolver.js";
import type { ViewFactory } from "../../../core/views/ViewFactory.js";

import { SettingsManager } from "./utilities/SettingsManager.js";
import { SettingsEvents } from "./events/SettingsEvents.js";
import { SettingsPopupView } from "./views/SettingsPopupView.pixi.js";
import { SettingsPopupController } from "./controllers/SettingsPopupController.js";
import { SettingsUIIds } from "./SettingsUIIds.js";
import type { SettingsField } from "./SettingsField.js";

export class SettingsBinding extends ModuleBinding {
  //  FIELDS
  private readonly _manager: SettingsManager;
  private readonly _events: SettingsEvents;

  constructor() {
    super();
    this._manager = new SettingsManager();
    this._events = new SettingsEvents();
  }

  //  METHODS
  /** Add a settings field. Can be called before or after initialization. */
  public addField(field: SettingsField): void {
    this._manager.addField(field);
  }

  public configureDI(diContainer: DIContainer, _viewDiContainer: DIContainer): void {
    diContainer.bindInstance(SettingsManager, this._manager);
    diContainer.bindInstance(SettingsEvents, this._events);
  }

  public configureViews(viewFactory: ViewFactory<IInstanceResolver>): void {
    viewFactory.registerPopup(SettingsUIIds.SettingsPopup, SettingsPopupView, SettingsPopupController);
  }
}
