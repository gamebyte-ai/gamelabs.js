import { ModuleBinding } from "../../../core/ModuleBinding.js";
import { AssetRequest } from "../../../core/assets/AssetRequest.js";
import { AssetTypes } from "../../../core/assets/AssetTypes.js";
import type { DIContainer } from "../../../core/di/DIContainer.js";
import { StyleManager } from "../../../core/styles/StyleManager.js";
import { UIComponentsAssetIds } from "./UIComponentsAssetIds.js";
import {
  UIComponentsStyleIds,
  type BackgroundComponentStyle,
  type ButtonComponentStyle,
  type RadioButtonComponentStyle,
  type SliderComponentStyle,
  type ToggleComponentStyle,
} from "./UIComponentsStyleTypes.js";

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

    this._assetRequestList.addRequest(
      new AssetRequest(
        AssetTypes.HudTexture,
        UIComponentsAssetIds.DefaultRadioUnselected,
        new URL("./assets/uicomponents/radio/unselected.png", import.meta.url).href,
      ),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(
        AssetTypes.HudTexture,
        UIComponentsAssetIds.DefaultRadioSelected,
        new URL("./assets/uicomponents/radio/selected.png", import.meta.url).href,
      ),
    );

    this._assetRequestList.addRequest(
      new AssetRequest(
        AssetTypes.HudTexture,
        UIComponentsAssetIds.DefaultToggleTrackOn,
        new URL("./assets/uicomponents/toggle/track-on.png", import.meta.url).href,
      ),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(
        AssetTypes.HudTexture,
        UIComponentsAssetIds.DefaultToggleTrackOff,
        new URL("./assets/uicomponents/toggle/track-off.png", import.meta.url).href,
      ),
    );
    this._assetRequestList.addRequest(
      new AssetRequest(
        AssetTypes.HudTexture,
        UIComponentsAssetIds.DefaultToggleThumb,
        new URL("./assets/uicomponents/toggle/thumb.png", import.meta.url).href,
      ),
    );

    this._assetRequestList.addRequest(
      new AssetRequest(
        AssetTypes.HudTexture,
        UIComponentsAssetIds.DefaultBackground,
        new URL("./assets/uicomponents/background/default.png", import.meta.url).href,
      ),
    );
  }

  /**
   * Registers default style entries on the view-DI `StyleManager`.
   * Mirrors `OnScreenControlsBinding.configureDI` — apps `modify` these
   * entries to retheme every Button / Slider at once, or pass per-
   * component overrides via the matching component preset fields which
   * deep-merge on top.
   *
   * Each `bg`-class slot opts into nine-slice rendering with `border: 2`
   * because the default-skin PNGs ship with a 2px black border. The
   * thumb slot keeps `border: 0` since the thumb is a plain stretched
   * sprite. Colours / alphas default to `0xffffff` / `1` so the textures
   * render untinted; per-component colour identity flows through
   * `Container.tint` on the component itself.
   */
  public override configureDI(_diContainer: DIContainer, viewDiContainer: DIContainer): void {
    const styleManager = viewDiContainer.getInstance(StyleManager);

    styleManager.add<ButtonComponentStyle>(UIComponentsStyleIds.Button, {
      idle: { textureId: UIComponentsAssetIds.DefaultButtonIdle, color: 0xffffff, alpha: 1, scaleX: 1, scaleY: 1, border: 2 },
      hover: { textureId: UIComponentsAssetIds.DefaultButtonHover, color: 0xffffff, alpha: 1, scaleX: 1, scaleY: 1, border: 2 },
      pressed: { textureId: UIComponentsAssetIds.DefaultButtonPressed, color: 0xffffff, alpha: 1, scaleX: 1, scaleY: 1, border: 2 },
      disabled: { textureId: UIComponentsAssetIds.DefaultButtonDisabled, color: 0xffffff, alpha: 1, scaleX: 1, scaleY: 1, border: 2 },
      label: {
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        fontSize: 16,
        fontWeight: "600",
        color: 0xffffff,
        alpha: 1,
      },
    });

    styleManager.add<SliderComponentStyle>(UIComponentsStyleIds.Slider, {
      track: { textureId: UIComponentsAssetIds.DefaultSliderTrack, color: 0xffffff, alpha: 1, scaleX: 1, scaleY: 1, border: 2 },
      fill: { textureId: UIComponentsAssetIds.DefaultSliderFill, color: 0xffffff, alpha: 1, scaleX: 1, scaleY: 1, border: 2 },
      thumb: { textureId: UIComponentsAssetIds.DefaultSliderThumb, color: 0xffffff, alpha: 1, scaleX: 1, scaleY: 1, border: 0 },
    });

    styleManager.add<RadioButtonComponentStyle>(UIComponentsStyleIds.RadioButton, {
      unselected: { textureId: UIComponentsAssetIds.DefaultRadioUnselected, color: 0xffffff, alpha: 1, scaleX: 1, scaleY: 1, border: 0 },
      selected: { textureId: UIComponentsAssetIds.DefaultRadioSelected, color: 0xffffff, alpha: 1, scaleX: 1, scaleY: 1, border: 0 },
      label: {
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        fontSize: 14,
        fontWeight: "600",
        color: 0xe8eef6,
        alpha: 1,
      },
    });

    styleManager.add<ToggleComponentStyle>(UIComponentsStyleIds.Toggle, {
      trackOn: { textureId: UIComponentsAssetIds.DefaultToggleTrackOn, color: 0xffffff, alpha: 1, scaleX: 1, scaleY: 1, border: 0 },
      trackOff: { textureId: UIComponentsAssetIds.DefaultToggleTrackOff, color: 0xffffff, alpha: 1, scaleX: 1, scaleY: 1, border: 0 },
      thumb: { textureId: UIComponentsAssetIds.DefaultToggleThumb, color: 0xffffff, alpha: 1, scaleX: 1, scaleY: 1, border: 0 },
    });

    styleManager.add<BackgroundComponentStyle>(UIComponentsStyleIds.Background, {
      bg: { textureId: UIComponentsAssetIds.DefaultBackground, color: 0xffffff, alpha: 1, scaleX: 1, scaleY: 1, border: 0 },
    });
  }
}
