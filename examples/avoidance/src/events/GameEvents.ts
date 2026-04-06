import type { Unsubscribe } from "gamelabsjs";

export class GameEvents {
  private readonly _gameOverListeners = new Set<(wave: number) => void>();
  private readonly _waveStartedListeners = new Set<(wave: number) => void>();
  private readonly _restartListeners = new Set<() => void>();
  private readonly _waveAnnounceEndedListeners = new Set<() => void>();
  private readonly _directionInputListeners = new Set<(dx: number, dy: number) => void>();

  onGameOver(cb: (wave: number) => void): Unsubscribe {
    this._gameOverListeners.add(cb);
    return () => this._gameOverListeners.delete(cb);
  }

  emitGameOver(wave: number): void {
    for (const cb of this._gameOverListeners) cb(wave);
  }

  onWaveStarted(cb: (wave: number) => void): Unsubscribe {
    this._waveStartedListeners.add(cb);
    return () => this._waveStartedListeners.delete(cb);
  }

  emitWaveStarted(wave: number): void {
    for (const cb of this._waveStartedListeners) cb(wave);
  }

  onRestart(cb: () => void): Unsubscribe {
    this._restartListeners.add(cb);
    return () => this._restartListeners.delete(cb);
  }

  emitRestart(): void {
    for (const cb of this._restartListeners) cb();
  }

  onWaveAnnounceEnded(cb: () => void): Unsubscribe {
    this._waveAnnounceEndedListeners.add(cb);
    return () => this._waveAnnounceEndedListeners.delete(cb);
  }

  emitWaveAnnounceEnded(): void {
    for (const cb of this._waveAnnounceEndedListeners) cb();
  }

  onDirectionInput(cb: (dx: number, dy: number) => void): Unsubscribe {
    this._directionInputListeners.add(cb);
    return () => this._directionInputListeners.delete(cb);
  }

  emitDirectionInput(dx: number, dy: number): void {
    for (const cb of this._directionInputListeners) cb(dx, dy);
  }
}
