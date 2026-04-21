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

export class SettingsBinding extends ModuleBinding {
  public configureDI(diContainer: DIContainer, _viewDiContainer: DIContainer): void {
    diContainer.bindInstance(SettingsModel, new SettingsModel(), [ISettingsModel]);
    diContainer.bindInstance(SettingsEvents, new SettingsEvents());
    // SettingsManager is an IInjectionTarget — all its deps come via inject().
    // Factory binding lets the container auto-fire inject() on first resolution.
    diContainer.bindSingleton(SettingsManager, () => new SettingsManager());
  }

  public configureViews(viewFactory: ViewFactory<IInstanceResolver>): void {
    viewFactory.registerPopup(SettingsUIIds.SettingsPopup, SettingsPopupView, SettingsPopupViewController);
  }
}
