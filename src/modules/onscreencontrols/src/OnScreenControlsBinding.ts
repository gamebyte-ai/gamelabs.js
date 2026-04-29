import { ModuleBinding } from "../../../core/ModuleBinding.js";
import type { DIContainer } from "../../../core/di/DIContainer.js";
import type { IInstanceResolver } from "../../../core/di/IInstanceResolver.js";
import type { ViewFactory } from "../../../core/views/ViewFactory.js";

import { AssetRequest } from "../../../core/assets/AssetRequest.js";
import { AssetTypes } from "../../../core/assets/AssetTypes.js";
import { StyleManager } from "../../../core/styles/StyleManager.js";

import { OnScreenControlManager } from "./utilities/OnScreenControlManager.js";
import { OnScreenControlEvents } from "./events/OnScreenControlEvents.js";
import { OnScreenControlsView } from "./views/OnScreenControlsView.pixi.js";
import { OnScreenControlsViewController } from "./controllers/OnScreenControlsViewController.js";
import { OnScreenControlsAssetIds } from "./OnScreenControlsAssetIds.js";
import { OscStyleIds, type OscButtonStyle, type OscJoystickStyle, type OscLabelStyle } from "./OnScreenControlTypes.js";

/**
 * Module binding for the on-screen controls (touch-friendly virtual
 * buttons + joysticks).
 *
 * Registers `OnScreenControlManager` and `OnScreenControlEvents` in the
 * app DI container, registers the `OnScreenControlsView` /
 * `OnScreenControlsViewController` pair with the view factory, and
 * pre-registers default texture asset requests for the four built-in
 * white-with-alpha PNGs (`JoystickBase`, `JoystickHandle`, `ButtonBg`,
 * `ButtonProgress`). The defaults are loaded automatically by
 * `GamelabsApp`; apps override either by replacing the URL via
 * `assetRequestList.overrideRequest(id, url)` or by passing a
 * different `textureId` per `SpriteStyle` slot.
 */
export class OnScreenControlsBinding extends ModuleBinding {
  public constructor() {
    super();

    // White-with-alpha defaults — runtime tints apply via
    // `SpriteStyle.color` on each slot. The `isSourceModule` switch keeps
    // the dev path (`../assets/...` next to source) and the published
    // path (`dist/assets/onscreencontrols/...`) in lockstep.
    const isSourceModule = import.meta.url.includes("/src/modules/onscreencontrols/src/");
    this._assetRequestList.addRequest(
      new AssetRequest(
        AssetTypes.HudTexture,
        OnScreenControlsAssetIds.JoystickBase,
        new URL(isSourceModule ? "../assets/joystick-base.png" : "./assets/onscreencontrols/joystick-base.png", import.meta.url).href,
      ),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(
        AssetTypes.HudTexture,
        OnScreenControlsAssetIds.JoystickHandle,
        new URL(isSourceModule ? "../assets/joystick-handle.png" : "./assets/onscreencontrols/joystick-handle.png", import.meta.url).href,
      ),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(
        AssetTypes.HudTexture,
        OnScreenControlsAssetIds.ButtonBg,
        new URL(isSourceModule ? "../assets/button-bg.png" : "./assets/onscreencontrols/button-bg.png", import.meta.url).href,
      ),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(
        AssetTypes.HudTexture,
        OnScreenControlsAssetIds.ButtonProgress,
        new URL(isSourceModule ? "../assets/button-progress.png" : "./assets/onscreencontrols/button-progress.png", import.meta.url).href,
      ),
    );
  }

  public configureDI(diContainer: DIContainer, viewDiContainer: DIContainer): void {
    const manager = new OnScreenControlManager();
    diContainer.bindInstance(OnScreenControlManager, manager);
    diContainer.bindInstance(OnScreenControlEvents, manager.events);

    // Default visual style for on-screen buttons. Apps modify this
    // entry to retheme every button at once; per-control overrides on
    // `addControl({ up, down, ... })` deep-merge on top.
    const styleManager = viewDiContainer.getInstance(StyleManager);
    styleManager.add<OscButtonStyle>(OscStyleIds.Button, {
      up: { textureId: OnScreenControlsAssetIds.ButtonBg, color: 0x222222, alpha: 0.5, scaleX: 1, scaleY: 1 },
      down: { textureId: OnScreenControlsAssetIds.ButtonBg, color: 0x444444, alpha: 0.8, scaleX: 1, scaleY: 1 },
      disabled: { textureId: OnScreenControlsAssetIds.ButtonBg, color: 0x4a5a4a, alpha: 0.55, scaleX: 1, scaleY: 1 },
      icon: { color: 0xffffff, alpha: 1, scaleX: 0.6, scaleY: 0.6 },
      progress: { textureId: OnScreenControlsAssetIds.ButtonProgress, color: 0xffffff, alpha: 0.85, scaleX: 1.1, scaleY: 1.1 },
    });

    styleManager.add<OscJoystickStyle>(OscStyleIds.Joystick, {
      base: { textureId: OnScreenControlsAssetIds.JoystickBase, color: 0xffffff, alpha: 0.85, scaleX: 1, scaleY: 1 },
      knob: { textureId: OnScreenControlsAssetIds.JoystickHandle, color: 0xffffff, alpha: 0.95, scaleX: 1, scaleY: 1 },
    });

    // Default text style for `OscLabel`. No bg by default — labels
    // that want a background sprite supply `bg.textureId` per-control.
    styleManager.add<OscLabelStyle>(OscStyleIds.Label, {
      text: {
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        fontSize: 16,
        fontWeight: "normal",
        color: 0xffffff,
        alpha: 1,
      },
    });
  }

  public configureViews(viewFactory: ViewFactory<IInstanceResolver>): void {
    viewFactory.register(OnScreenControlsView, OnScreenControlsViewController);
  }
}
