import type { Unsubscribe } from "@gamebyte/gamelabsjs";
import { GameState } from "../constants/GameState";

/**
 * Top-level game state model. Owns the current {@link GameState}
 * (Playing / GameOver); the boards controller writes via
 * {@link setState} after the per-placement placeability recompute;
 * the HUD controller subscribes via {@link onStateChanged} to flip
 * the centered end-state label.
 *
 * Transitions are caller-validated (no enforced state machine):
 * `setState` is a no-op if the new state matches the current one,
 * so listeners only fire on real changes.
 *
 * Same shape as Solitaire's GameStateModel.
 */
export class GameStateModel {
  private _state: GameState = GameState.Playing;
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
