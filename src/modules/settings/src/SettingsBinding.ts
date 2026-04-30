import { ModuleBinding } from "../../../core/ModuleBinding.js";
import type { DIContainer } from "../../../core/di/DIContainer.js";
import type { IInstanceResolver } from "../../../core/di/IInstanceResolver.js";
import type { ViewFactory } from "../../../core/views/ViewFactory.js";

import { SettingsBooleanField, SettingsNumberField } from "./SettingsField.js";
import { SettingsModel } from "./models/SettingsModel.js";
import { ISettingsModel } from "./models/ISettingsModel.js";
import { SettingsManager } from "./utilities/SettingsManager.js";
import { SettingsEvents } from "./events/SettingsEvents.js";
import { SettingsPopupView } from "./views/SettingsPopupView.pixi.js";
import { SettingsPopupViewController } from "./controllers/SettingsPopupViewController.js";
import { SettingsUIIds } from "./constants/SettingsUIIds.js";

/**
 * Constructor options for {@link SettingsBinding}.
 */
export type SettingsBindingOpts = {
  /**
   * When `true`, the binding registers a standard default set of fields
   * on the `SettingsManager` during `configureDI` — `sfx`, `music`,
   * `sfxVolume`, `musicVolume`. Useful for apps that want a ready-to-go
   * settings popup without writing per-app `addField(...)` calls. Apps
   * that want a custom field set leave this as `false` (default) and
   * register their own fields after `addModule`. @default false
   */
  defaults?: boolean;
};

const DEFAULT_FIELDS_FACTORIES: ReadonlyArray<() => SettingsBooleanField | SettingsNumberField> = [
  () => new SettingsBooleanField("sfx", "Sound Effects", true),
  () => new SettingsBooleanField("music", "Music", true),
  () => new SettingsNumberField("sfxVolume", "SFX Volume", 100, 0, 100, 5),
  () => new SettingsNumberField("musicVolume", "Music Volume", 70, 0, 100, 5),
];

export class SettingsBinding extends ModuleBinding {
  private readonly _registerDefaults: boolean;

  constructor(opts: SettingsBindingOpts = {}) {
    super();
    this._registerDefaults = opts.defaults ?? false;
  }

  public configureDI(diContainer: DIContainer, _viewDiContainer: DIContainer): void {
    diContainer.bindInstance(SettingsModel, new SettingsModel(), [ISettingsModel]);
    diContainer.bindInstance(SettingsEvents, new SettingsEvents());
    // SettingsManager is an IInjectionTarget — all its deps come via inject().
    // Factory binding lets the container auto-fire inject() on first resolution.
    diContainer.bindSingleton(SettingsManager, () => new SettingsManager());

    if (this._registerDefaults) {
      // Resolve the manager once so its factory + inject() runs against
      // an empty model, then register the framework's standard field
      // set. Apps that opt in via `new SettingsBinding({ defaults: true })`
      // get a ready-to-go popup; per-app `addField(...)` calls still work
      // afterwards — same field name overrides the def, value persists.
      const manager = diContainer.getInstance(SettingsManager);
      for (const factory of DEFAULT_FIELDS_FACTORIES) {
        manager.addField(factory());
      }
    }
  }

  public configureViews(viewFactory: ViewFactory<IInstanceResolver>): void {
    viewFactory.registerPopup(SettingsUIIds.SettingsPopup, SettingsPopupView, SettingsPopupViewController);
  }
}
