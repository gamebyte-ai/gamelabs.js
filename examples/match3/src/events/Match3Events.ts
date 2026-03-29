import type { Unsubscribe } from "gamelabsjs";

export class Match3Events {
  private readonly _scoreChangedListeners = new Set<(score: number) => void>();

  public onScoreChanged(cb: (score: number) => void): Unsubscribe {
    this._scoreChangedListeners.add(cb);
    return () => this._scoreChangedListeners.delete(cb);
  }

  public emitScoreChanged(score: number): void {
    for (const cb of this._scoreChangedListeners) cb(score);
  }
}
