import { GameState } from "../constants/GameState";

/**
 * Top-level game state model. Owns the current {@link GameState}
 * (Playing / GameOver); the controller writes to it via
 * {@link setState} after the per-placement placeability recompute.
 *
 * No event channel yet — step 9 only wires the drag-enabled gate
 * via the view interface. A future HUD overlay can subscribe to
 * state changes through an added `onStateChanged` channel without
 * touching the controller.
 */
export class GameStateModel {
  private _state: GameState = GameState.Playing;

  public get state(): GameState {
    return this._state;
  }

  public setState(state: GameState): void {
    this._state = state;
  }
}
