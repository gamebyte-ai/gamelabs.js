import { ModuleBinding } from "../../../core/ModuleBinding.js";
import { AssetRequest } from "../../../core/assets/AssetRequest.js";
import { AssetTypes } from "../../../core/assets/AssetTypes.js";
import type { DIContainer } from "../../../core/di/DIContainer.js";
import type { IInstanceResolver } from "../../../core/di/IInstanceResolver.js";
import { AudioService } from "../../../core/services/AudioService.js";
import type { ViewFactory } from "../../../core/views/ViewFactory.js";

import { SettingsBooleanField, SettingsNumberField } from "./SettingsField.js";
import { SettingsModel } from "./models/SettingsModel.js";
import { ISettingsModel } from "./models/ISettingsModel.js";
import { SettingsManager } from "./utilities/SettingsManager.js";
import { SettingsEvents } from "./events/SettingsEvents.js";
import { SettingsPopupView } from "./views/SettingsPopupView.pixi.js";
import { SettingsPopupViewController } from "./controllers/SettingsPopupViewController.js";
import { SettingsAssetIds } from "./constants/SettingsAssetIds.js";
import { SettingsUIIds } from "./constants/SettingsUIIds.js";

/**
 * Constructor options for {@link SettingsBinding}.
 */
export type SettingsBindingOpts = {
  /**
   * When `true`, the binding registers the framework's standard audio
   * field set on the `SettingsManager` during `configureDI` — `sfx`,
   * `music`, `sfxVolume`, `musicVolume` — and installs an audio bridge
   * that wires those four fields to `AudioService` so the popup
   * actually mutes / attenuates audio. Useful for apps that want a
   * ready-to-go audio settings popup without writing per-app
   * `addField(...)` calls. Apps that want a custom field set leave
   * this as `false` (default) and register their own fields after
   * `addModule`. @default false
   */
  audioFields?: boolean;
};

const AUDIO_FIELDS_FACTORIES: ReadonlyArray<() => SettingsBooleanField | SettingsNumberField> = [
  () => new SettingsBooleanField("sfx", "Sound Effects", true),
  () => new SettingsBooleanField("music", "Music", true),
  () => new SettingsNumberField("sfxVolume", "SFX Volume", 100, 0, 100, 5),
  () => new SettingsNumberField("musicVolume", "Music Volume", 70, 0, 100, 5),
];

/**
 * Module binding for the typed settings store + ready-to-use popup UI.
 *
 * Registers `SettingsModel` (`ISettingsModel`), `SettingsEvents`, and
 * `SettingsManager` in the DI container, plus the `SettingsPopupView` /
 * `SettingsPopupViewController` pair with the view factory.
 *
 * Ships these assets:
 * - `SettingsAssetIds.PanelBg` — `HudTexture` PNG used by the popup's
 *   9-slice rounded panel background. Generated procedurally by
 *   `scripts/generateSettingsTextures.mjs`.
 * - Five `Text` assets carrying JSON-encoded UIComponent style overrides
 *   for every themed surface in the popup
 *   (`PanelBgStyle`, `TitleStyle`, `FieldLabelStyle`, `CloseButtonStyle` —
 *   four total now that the slider value-readout label has been removed).
 *   Each override deep-merges on top of the corresponding
 *   `UIComponentsStyleIds.<X>` defaults via `StyleManager.resolve`.
 *
 * Construction opts (`SettingsBindingOpts`):
 * - `audioFields: true` — register the framework's standard audio
 *   field set (`sfx`, `music`, `sfxVolume`, `musicVolume`) on
 *   `SettingsManager` AND install an `AudioService` bridge that wires
 *   those four field names to mute / volume calls. Apps that pass this
 *   opt get a working audio settings popup out of the box; the bridge
 *   also calls `audio.resume()` on every change so toggling music on
 *   wakes the suspended `AudioContext`.
 * - `audioFields: false` (default) — apps register their own field set
 *   via `manager.addField(...)` after `addModule`. The audio bridge is
 *   not installed; apps own their own SettingsEvents → AudioService
 *   wiring (or none, for non-audio settings).
 *
 * Apps re-theme the popup either by overriding one of the Text-asset
 * URLs via `binding.assetRequestList.overrideRequest(id, url)`, by
 * supplying their own JSON content before app boot, or by calling
 * `styleManager.modify(UIComponentsStyleIds.<X>, ...)` to change the
 * framework defaults that the popup's overrides merge on top of.
 */
export class SettingsBinding extends ModuleBinding {
  private readonly _registerAudioFields: boolean;

  /**
   * Style overrides for each themed surface inside `SettingsPopupView`,
   * shipped as inline Text assets so the popup view consumes data
   * instead of literals. Each JSON deep-merges on top of the
   * corresponding `UIComponentsStyleIds.<X>` defaults via
   * `StyleManager.resolve`; apps re-theme by overriding the URL or by
   * supplying their own JSON content before app boot.
   *
   * JSON has no hex-literal syntax — colour values are encoded as
   * decimal (`0xRRGGBB` → matching base-10 number):
   * - `0xffffff` = `16777215`  (white)
   * - `0x2d3748` = `2963272`   (slate-700, title)
   * - `0x4a5568` = `4871528`   (slate-600, field labels)
   *
   * The close button intentionally omits a `color` override so the
   * framework's `Button` default label colour (white) flows through —
   * the framework's idle/hover/pressed PNGs are dark slate, so a
   * slate-600 override would be unreadable.
   */
  private _panelBgStyle = '{"image":{"textureId":"Settings.PanelBg","color":16777215,"alpha":0.95,"border":16}}';
  private _titleStyle = '{"text":{"fontSize":22,"fontWeight":"800","color":2963272}}';
  private _fieldLabelStyle = '{"text":{"fontSize":14,"fontWeight":"600","color":4871528}}';
  private _closeButtonStyle = '{"label":{"fontSize":14,"fontWeight":"600"}}';

  constructor(opts: SettingsBindingOpts = {}) {
    super();
    this._registerAudioFields = opts.audioFields ?? false;

    this._assetRequestList.addRequest(
      new AssetRequest(AssetTypes.HudTexture, SettingsAssetIds.PanelBg, new URL("./assets/settings/panel-bg.png", import.meta.url).href),
    );

    // Text style assets for every themed surface in the popup —
    // inlined via `AssetRequest`'s `content` parameter (no URL needed).
    // Mirrors `MainScreenBinding`'s preset registrations.
    this._assetRequestList.addRequest(new AssetRequest(AssetTypes.Text, SettingsAssetIds.PanelBgStyle, "", this._panelBgStyle));
    this._assetRequestList.addRequest(new AssetRequest(AssetTypes.Text, SettingsAssetIds.TitleStyle, "", this._titleStyle));
    this._assetRequestList.addRequest(new AssetRequest(AssetTypes.Text, SettingsAssetIds.FieldLabelStyle, "", this._fieldLabelStyle));
    this._assetRequestList.addRequest(new AssetRequest(AssetTypes.Text, SettingsAssetIds.CloseButtonStyle, "", this._closeButtonStyle));
  }

  public configureDI(diContainer: DIContainer, _viewDiContainer: DIContainer): void {
    diContainer.bindInstance(SettingsModel, new SettingsModel(), [ISettingsModel]);
    diContainer.bindInstance(SettingsEvents, new SettingsEvents());
    // SettingsManager is an IInjectionTarget — all its deps come via inject().
    // Factory binding lets the container auto-fire inject() on first resolution.
    diContainer.bindSingleton(SettingsManager, () => new SettingsManager());

    if (this._registerAudioFields) {
      // Resolve the manager once so its factory + inject() runs against
      // an empty model, then register the framework's audio field set
      // (sfx / music / sfxVolume / musicVolume). Apps that opt in via
      // `new SettingsBinding({ audioFields: true })` get a ready-to-go
      // popup; per-app `addField(...)` calls still work afterwards —
      // same field name overrides the def, value persists.
      const manager = diContainer.getInstance(SettingsManager);
      for (const factory of AUDIO_FIELDS_FACTORIES) {
        manager.addField(factory());
      }

      // Bridge the four audio field names to the framework's
      // `AudioService` so toggling them in the popup actually mutes /
      // attenuates the audio output. Only installed when
      // `audioFields: true` is set — apps with their own field names
      // own their own bridge.
      this._installAudioBridge(diContainer);
    }
  }

  /**
   * Wires the framework's standard settings field set (`sfx`, `music`,
   * `sfxVolume`, `musicVolume`) to `AudioService`. Applies the model's
   * current values once on install so persisted state from a prior
   * session takes effect on boot, then subscribes to `SettingsEvents`
   * so subsequent edits propagate.
   *
   * Mappings:
   * - `sfx: boolean`         → `audio.setSfxMute(!value)` (true = unmuted)
   * - `music: boolean`       → `audio.setMusicMute(!value)`
   * - `sfxVolume: 0..100`    → `audio.setSfxVolume(value / 100)` (Audio takes 0..1)
   * - `musicVolume: 0..100`  → `audio.setMusicVolume(value / 100)`
   *
   * Each subsequent `apply` call also wakes the `AudioContext` via
   * `audio.resume()` — the user-driven settings change is itself a
   * user gesture, which is what browsers require for autoplay. Without
   * this, toggling music on in the popup only adjusts the gain; the
   * AudioContext stays suspended until some other path (e.g. a SFX
   * service calling `ctx.resume()` on click) wakes it.
   */
  private _installAudioBridge(diContainer: DIContainer): void {
    const model = diContainer.getInstance(ISettingsModel);
    const events = diContainer.getInstance(SettingsEvents);
    const audio = diContainer.getInstance(AudioService);

    const apply = (name: string): void => {
      // `resume` is idempotent — no-op when the context is already
      // running. Calling it from every change handler ensures the
      // AudioContext is awake on the same user gesture that triggered
      // the setting change (so e.g. flipping the music toggle starts
      // playback immediately rather than waiting for a later click).
      audio.resume();
      switch (name) {
        case "sfx":
          audio.setSfxMute(!model.getBooleanValue("sfx"));
          return;
        case "music":
          audio.setMusicMute(!model.getBooleanValue("music"));
          return;
        case "sfxVolume":
          audio.setSfxVolume(model.getNumberValue("sfxVolume") / 100);
          return;
        case "musicVolume":
          audio.setMusicVolume(model.getNumberValue("musicVolume") / 100);
          return;
      }
    };

    // Apply current values up front so persisted state survives a reload.
    // No `resume()` here — install runs at boot, before any user
    // gesture, so `resume()` would no-op anyway. The first user
    // gesture (settings change, SFX click, etc.) wakes the context.
    this._applyInitial(model, audio);

    // Apply every subsequent change. The listener is intentionally never
    // unsubscribed — the binding's lifetime matches the app's, and
    // SettingsEvents is a singleton owned by the same DI container.
    events.onValueChanged(apply);
  }

  /**
   * Sets the initial mute / volume state from the persisted model
   * values without calling `audio.resume()` (no user gesture is in
   * scope at boot time, so resume would no-op).
   */
  private _applyInitial(model: ISettingsModel, audio: AudioService): void {
    audio.setSfxMute(!model.getBooleanValue("sfx"));
    audio.setMusicMute(!model.getBooleanValue("music"));
    audio.setSfxVolume(model.getNumberValue("sfxVolume") / 100);
    audio.setMusicVolume(model.getNumberValue("musicVolume") / 100);
  }

  public configureViews(viewFactory: ViewFactory<IInstanceResolver>): void {
    viewFactory.registerPopup(SettingsUIIds.SettingsPopup, SettingsPopupView, SettingsPopupViewController);
  }
}
