import { ModuleBinding } from "../../../core/ModuleBinding.js";
import type { DIContainer } from "../../../core/di/DIContainer.js";
import type { IInstanceResolver } from "../../../core/di/IInstanceResolver.js";
import type { ViewFactory } from "../../../core/views/ViewFactory.js";

import { AssetRequest } from "../../../core/assets/AssetRequest.js";
import { AssetTypes } from "../../../core/assets/AssetTypes.js";

import { OnScreenControlManager } from "./utilities/OnScreenControlManager.js";
import { OnScreenControlEvents } from "./events/OnScreenControlEvents.js";
import { OnScreenControlsView } from "./views/OnScreenControlsView.pixi.js";
import { OnScreenControlsViewController } from "./controllers/OnScreenControlsViewController.js";
import { OnScreenControlsAssetIds } from "./OnScreenControlsAssetIds.js";

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
 * different `textureId` per `OscVisual` slot.
 */
export class OnScreenControlsBinding extends ModuleBinding {
  public constructor() {
    super();

    // White-with-alpha defaults — runtime tints apply via
    // `OscVisual.color` on each slot. The `isSourceModule` switch keeps
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

  public configureDI(diContainer: DIContainer, _viewDiContainer: DIContainer): void {
    const manager = new OnScreenControlManager();
    diContainer.bindInstance(OnScreenControlManager, manager);
    diContainer.bindInstance(OnScreenControlEvents, manager.events);
  }

  public configureViews(viewFactory: ViewFactory<IInstanceResolver>): void {
    viewFactory.register(OnScreenControlsView, OnScreenControlsViewController);
  }
}
