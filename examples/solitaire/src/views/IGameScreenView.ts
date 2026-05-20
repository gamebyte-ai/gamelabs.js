import type { IScreenView, Unsubscribe } from "@gamebyte/gamelabsjs";

export interface IGameScreenView extends IScreenView {
  /** Fires on every undo-button activation. The screen controller
   *  relays this into the shared `UndoEvents.request()` so the board
   *  controller (a different controller on a different view) can
   *  perform the actual undo. */
  onUndoClicked(callback: () => void): Unsubscribe;
  /** Push a pre-formatted score string into the HUD's score label
   *  (e.g. `"Score: 25"`). The controller owns the prefix and
   *  formatting; the view just renders. */
  setScoreText(text: string): void;
  /** Push a pre-formatted time string into the HUD's time label
   *  (e.g. `"01:23"`). The controller resolves elapsed time + config
   *  through {@link TimeFormatter}; the view just renders. */
  setTimeText(text: string): void;
  /** Set the centered end-state HUD label. `null` hides the label;
   *  any non-null `appearance` shows it with the given text and
   *  colour. The screen controller picks both per terminal state
   *  (e.g. red "Time is Over" for a count-down expiry, green
   *  "You Win!" when all foundations complete). */
  setEndStateLabel(appearance: { readonly text: string; readonly color: number } | null): void;
}
