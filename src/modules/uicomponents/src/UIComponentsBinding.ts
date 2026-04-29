import { ModuleBinding } from "../../../core/ModuleBinding.js";
import { AssetRequest } from "../../../core/assets/AssetRequest.js";
import { AssetTypes } from "../../../core/assets/AssetTypes.js";
import { UIComponentsAssetIds } from "./UIComponentsAssetIds.js";

/**
 * Ships the framework's default skins for `ButtonComponent`
 * (idle / hover / pressed / disabled) and `SliderComponent`
 * (track / fill / thumb). Apps that add this binding get fully-textured
 * components out of the box without supplying any art.
 *
 * Consumers override individual textures by calling
 * `binding.assetRequestList.overrideRequest(id, url)` before `addModule`,
 * or by passing a custom `skin` to a component that points at their own
 * asset IDs.
 *
 * Note on URL construction: each URL is built with a *literal* path string
 * (no template literals or computed branches) so Vite's static analyzer
 * recognizes the `new URL(literal, import.meta.url)` pattern and bundles
 * the PNGs into the consumer's production build. The paths are relative
 * to this module's built location in `dist/`; if you fork the lib and
 * load it from source, paths still resolve at build time but the dev-time
 * files live under `src/modules/uicomponents/assets/{button,slider}/`.
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

    this._assetRequestList.addRequest(
      new AssetRequest(
        AssetTypes.HudTexture,
        UIComponentsAssetIds.DefaultSliderTrack,
        new URL("./assets/uicomponents/slider/track.png", import.meta.url).href,
      ),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(
        AssetTypes.HudTexture,
        UIComponentsAssetIds.DefaultSliderFill,
        new URL("./assets/uicomponents/slider/fill.png", import.meta.url).href,
      ),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(
        AssetTypes.HudTexture,
        UIComponentsAssetIds.DefaultSliderThumb,
        new URL("./assets/uicomponents/slider/thumb.png", import.meta.url).href,
      ),
    );
  }
}
