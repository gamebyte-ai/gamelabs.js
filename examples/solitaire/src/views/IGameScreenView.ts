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
  /** Show or hide the centered "Game Over" overlay. Called by the
   *  screen controller in response to the game-state transition to
   *  GameOver — the view itself never decides when to show it. */
  setGameOver(over: boolean): void;
}
