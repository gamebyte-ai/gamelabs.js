/**
 * Asset ids for textures shipped with the onscreencontrols module.
 *
 * Apps that want custom art can override either request via
 * `OnScreenControlsBinding.assetRequestList.overrideRequest(id, url)`
 * before the app finishes loading. Joystick and button configs that
 * omit their texture id fall back to these defaults.
 */
export enum OnScreenControlsAssetIds {
  JoystickBase = "OnScreenControls.JoystickBase",
  JoystickHandle = "OnScreenControls.JoystickHandle",
  ButtonBg = "OnScreenControls.ButtonBg",
  ButtonProgress = "OnScreenControls.ButtonProgress",
}
