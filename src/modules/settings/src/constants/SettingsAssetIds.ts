/**
 * Asset ids for the assets shipped by `SettingsBinding`. The binding
 * registers an asset request for each one against the framework's
 * `AssetManager`; views look up the loaded asset via these ids.
 *
 * Two flavours of asset live here:
 * - **`HudTexture`** assets (currently `PanelBg`) — runtime PNGs.
 *   Apps re-skin via `binding.assetRequestList.overrideRequest(id, url)`
 *   or by passing a different `textureId` on a per-component override.
 * - **`Text`** assets carrying JSON-encoded UIComponent style overrides
 *   (everything ending in `Style`). The view loads the JSON, parses it,
 *   and feeds it to `styleManager.resolve(<componentStyleId>, override)`
 *   so the override deep-merges on top of the framework's registered
 *   defaults. Apps re-theme by replacing the URL or by supplying their
 *   own JSON content before app boot.
 *
 * JSON has no hex-literal syntax, so colour values inside the Text
 * assets are encoded as decimal (`0xRRGGBB` → matching base-10 number).
 */
export const SettingsAssetIds = {
  /**
   * 9-slice rounded panel background texture used by `SettingsPopupView`.
   * Ships as a 64×64 white-with-alpha PNG with a 16px corner radius;
   * the runtime tint (`SpriteStyle.color`) controls the final colour.
   */
  PanelBg: "Settings.PanelBg",
  /**
   * JSON-encoded `ImageComponentStyle` override for the popup's panel
   * background. Selects the `PanelBg` texture and applies the popup's
   * translucent-white look (`alpha: 0.95`, 9-slice `border: 16`).
   */
  PanelBgStyle: "Settings.PanelBgStyle",
  /**
   * JSON-encoded `LabelComponentStyle` override for the popup's title
   * ("Settings"). Heavier weight + slate-700 colour to read as a heading
   * against the white panel.
   */
  TitleStyle: "Settings.TitleStyle",
  /**
   * JSON-encoded `LabelComponentStyle` override for each row's
   * field-name label (left side). Slate-600 / 14px / 600-weight.
   */
  FieldLabelStyle: "Settings.FieldLabelStyle",
  /**
   * JSON-encoded `ButtonComponentStyle` override for the popup's close
   * button. Deep-merged on top of the framework `UIComponentsStyleIds.Button`
   * defaults via `StyleManager.resolve`; apps that want a different
   * close-button look replace the URL via
   * `binding.assetRequestList.overrideRequest(id, url)` or supply their
   * own JSON content before app boot.
   */
  CloseButtonStyle: "Settings.CloseButtonStyle",
} as const;
