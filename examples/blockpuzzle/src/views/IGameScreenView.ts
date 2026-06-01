import type { IScreenView } from "@gamebyte/gamelabsjs";

/**
 * Game screen surface in the Pixi HUD layer. Owns the corner title,
 * the corner score + time labels, and the centered end-state label
 * the controller toggles on game-over.
 */
export interface IGameScreenView extends IScreenView {
  /** Pre-formatted score string (e.g. `"Score: 42"`). The controller
   *  owns the prefix and formatting; the view just renders. */
  setScoreText(text: string): void;
  /** Pre-formatted time string (e.g. `"01:23"`). */
  setTimeText(text: string): void;
  /** Show / hide the centered end-state label. `null` hides it; a
   *  non-null appearance shows the given text in the given colour
   *  (applied via container tint, the base label is white). */
  setEndStateLabel(appearance: { readonly text: string; readonly color: number } | null): void;
}
