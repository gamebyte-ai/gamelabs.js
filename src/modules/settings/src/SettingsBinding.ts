import { ModuleBinding } from "../../../core/ModuleBinding.js";
import type { DIContainer } from "../../../core/di/DIContainer.js";
import type { IInstanceResolver } from "../../../core/di/IInstanceResolver.js";
import type { ViewFactory } from "../../../core/views/ViewFactory.js";

import { SettingsModel } from "./models/SettingsModel.js";
import { ISettingsModel } from "./models/ISettingsModel.js";
import { SettingsManager } from "./utilities/SettingsManager.js";
import { SettingsEvents } from "./events/SettingsEvents.js";
import { SettingsPopupView } from "./views/SettingsPopupView.pixi.js";
import { SettingsPopupViewController } from "./controllers/SettingsPopupViewController.js";
import { SettingsUIIds } from "./constants/SettingsUIIds.js";
import type { SettingsField } from "./SettingsField.js";

export class SettingsBinding extends ModuleBinding {
  private readonly _model: SettingsModel;
  private readonly _manager: SettingsManager;
  private readonly _events: SettingsEvents;

  public constructor() {
    super();
    this._model = new SettingsModel();
    this._manager = new SettingsManager(this._model);
    this._events = new SettingsEvents();
  }

  /** Add a settings field. Can be called before or after initialization. */
  public addField(field: SettingsField): void {
    this._manager.addField(field);
  }

  public configureDI(diContainer: DIContainer, _viewDiContainer: DIContainer): void {
    diContainer.bindInstance(SettingsModel, this._model, [ISettingsModel]);
    diContainer.bindInstance(SettingsManager, this._manager);
    diContainer.bindInstance(SettingsEvents, this._events);

    // bindInstance skips IInjectionTarget.inject(), so call it manually
    // to wire up _storage and _events. This also re-hydrates any fields
    // that were added before DI was configured (see SettingsManager.inject).
    this._manager.inject(diContainer);
  }

  public configureViews(viewFactory: ViewFactory<IInstanceResolver>): void {
    viewFactory.registerPopup(SettingsUIIds.SettingsPopup, SettingsPopupView, SettingsPopupViewController);
  }
}
