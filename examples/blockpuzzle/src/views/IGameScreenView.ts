import type { IScreenView } from "@gamebyte/gamelabsjs";

/**
 * Snapshot of the combo state pushed to the view by the HUD
 * controller. The view derives the label text + per-circle colours
 * from these two numbers + config.
 */
export interface ComboHudState {
  /** 0 = inactive (label hidden, all circles inactive colour);
   *  1 = "COMBO READY"; 2+ = "COMBO Xn". */
  readonly level: number;
  /** 0..`config.combo.maxMoves`. Circles at indices `[0, movesRemaining)`
   *  render in the active colour, the rest in the inactive colour. */
  readonly movesRemaining: number;
}

/**
 * Game screen surface in the Pixi HUD layer. Owns the corner title,
 * corner score + time labels, top-centre combo widget, and the
 * centered end-state label the controller toggles on game-over.
 */
export interface IGameScreenView extends IScreenView {
  /** Pre-formatted score string (e.g. `"Score: 42"`). The controller
   *  owns the prefix and formatting; the view just renders. */
  setScoreText(text: string): void;
  /** Pre-formatted time string (e.g. `"01:23"`). */
  setTimeText(text: string): void;
  /** Push the combo state into the top-centre widget. The view
   *  derives the label text + circle colours from this. */
  setComboState(state: ComboHudState): void;
  /** Show / hide the centered end-state label. `null` hides it; a
   *  non-null appearance shows the given text in the given colour
   *  (applied via container tint, the base label is white). */
  setEndStateLabel(appearance: { readonly text: string; readonly color: number } | null): void;
}
