import type { IView, Unsubscribe } from "@gamebyte/gamelabsjs";

/**
 * Live preview surface for the Background demo. Renders two
 * fixed-size containers stacked vertically — one wrapping a
 * `BackgroundComponent` resolved from the framework default style, one
 * wrapping a custom-skin `BackgroundComponent` pointing at the
 * playground's own asset id. The component's cover-fit math fills
 * each wrapper without distortion.
 *
 * The view also hosts a "Open settings" button that opens the framework
 * `SettingsBinding` popup so the settings module can be exercised
 * inside the playground (otherwise it's only reachable from a game
 * example).
 */
export interface IBackgroundDemoView extends IView {
  /** Drives both backgrounds' overlay alpha so the user can tune readability. */
  setOverlayAlpha(alpha: number): void;
  /** Toggles the debug outline drawn around each background's container. */
  setOutlineVisible(visible: boolean): void;
  /** Fires when the user taps the "Open settings" button in the demo. */
  onOpenSettingsPressed(cb: () => void): Unsubscribe;
}
