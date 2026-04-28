import { ModuleBinding } from "../../../core/ModuleBinding.js";
import { AssetRequest } from "../../../core/assets/AssetRequest.js";
import { AssetTypes } from "../../../core/assets/AssetTypes.js";
import { UIComponentsAssetIds } from "./UIComponentsAssetIds.js";

/**
 * Ships the framework's default button skin (idle / hover / pressed /
 * disabled). Apps that add this binding get a fully-textured `ButtonComponent`
 * out of the box without supplying any art.
 *
 * Consumers override individual states by calling
 * `binding.assetRequestList.overrideRequest(id, url)` before `addModule`,
 * or by passing a custom `skin` to `ButtonComponent` that points at their
 * own asset IDs.
 *
 * Note on URL construction: each URL is built with a *literal* path string
 * (no template literals or computed branches) so Vite's static analyzer
 * recognizes the `new URL(literal, import.meta.url)` pattern and bundles
 * the four PNGs into the consumer's production build. The paths are
 * relative to this module's built location in `dist/`; if you fork the
 * lib and load it from source, paths still resolve at build time but the
 * dev-time files live under `src/modules/uicomponents/assets/button/`.
 */
export class UIComponentsBinding extends ModuleBinding {
  constructor() {
    super();

    this._assetRequestList.addRequest(
      new AssetRequest(
        AssetTypes.HudTexture,
        UIComponentsAssetIds.DefaultButtonIdle,
        new URL("./assets/uicomponents/button/idle.png", import.meta.url).href,
      ),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(
        AssetTypes.HudTexture,
        UIComponentsAssetIds.DefaultButtonHover,
        new URL("./assets/uicomponents/button/hover.png", import.meta.url).href,
      ),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(
        AssetTypes.HudTexture,
        UIComponentsAssetIds.DefaultButtonPressed,
        new URL("./assets/uicomponents/button/pressed.png", import.meta.url).href,
      ),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(
        AssetTypes.HudTexture,
        UIComponentsAssetIds.DefaultButtonDisabled,
        new URL("./assets/uicomponents/button/disabled.png", import.meta.url).href,
      ),
    );
  }
}
