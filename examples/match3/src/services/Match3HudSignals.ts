/**
 * Bridges match-3 score updates from the grid world controller to the HUD screen (no game rules).
 */
export class Match3HudSignals {
  private _onScore: ((score: number) => void) | null = null;

  public setScoreListener(listener: ((score: number) => void) | null): void {
    this._onScore = listener;
  }

  public notifyScore(score: number): void {
    this._onScore?.(score);
  }
}
