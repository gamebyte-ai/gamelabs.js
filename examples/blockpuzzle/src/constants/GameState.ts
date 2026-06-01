/**
 * Top-level game state. Drives the drag-enabled gate on the view
 * and is the hook future HUD overlays (game-over screen, restart
 * prompt) would subscribe to.
 */
export enum GameState {
  Playing = "playing",
  /** Every tray piece is unplaceable on the current grid. Drag is
   *  disabled until a fresh hand is dealt (out of scope this step
   *  — no restart wiring yet). */
  GameOver = "gameOver",
}
