import type { Unsubscribe } from "@gamebyte/gamelabsjs";

export enum GameState {
  /** Initial-deal animation is running. Timer is paused; player
   *  input is blocked (the view's `isAnimating` gate covers it). */
  Dealing = "dealing",
  /** Deal complete; player can interact and the timer ticks. */
  Playing = "playing",
  /** Countdown reached zero. Player input is blocked at the
   *  controller layer; the HUD shows a "Time is Over" label.
   *  Distinct from a future losing state so the two can carry
   *  different end-of-game messaging and side-effects. */
  TimeOver = "timeOver",
  /** All four foundations are complete (A→K of each suit). Player
   *  input is blocked, the timer freezes, and the HUD shows a
   *  "You Win!" label over the final board layout. */
  Won = "won",
}

/**
 * Single-source-of-truth for game lifecycle state. Read by
 * {@link SolitaireApp} to gate timer ticks, by
 * {@link BoardViewController} to gate input, and by
 * {@link GameScreenViewController} to drive the end-state HUD label.
 *
 * Transitions are caller-validated (no enforced state-machine
 * here): App moves Dealing→Playing in the deal-animation callback;
 * the screen controller moves Playing→TimeOver when the configured
 * countdown reaches zero. A separate losing state belongs alongside
 * TimeOver when that mechanic lands.
 */
export class GameStateModel {
  private _state: GameState = GameState.Dealing;
  private readonly _listeners = new Set<(state: GameState) => void>();

  public get state(): GameState {
    return this._state;
  }

  public setState(state: GameState): void {
    if (this._state === state) return;
    this._state = state;
    this.notify();
  }

  public onStateChanged(callback: (state: GameState) => void): Unsubscribe {
    this._listeners.add(callback);
    return () => {
      this._listeners.delete(callback);
    };
  }

  private notify(): void {
    for (const cb of this._listeners) cb(this._state);
  }
}
