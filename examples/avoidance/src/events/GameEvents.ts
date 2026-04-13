import type { Unsubscribe } from "@gamebyte/gamelabsjs";

export class GameEvents {
  private readonly _gameOverListeners = new Set<(wave: number) => void>();
  private readonly _waveStartedListeners = new Set<(wave: number) => void>();
  private readonly _restartListeners = new Set<() => void>();
  private readonly _waveAnnounceEndedListeners = new Set<() => void>();
  private readonly _directionInputListeners = new Set<(dx: number, dy: number) => void>();

  public onGameOver(cb: (wave: number) => void): Unsubscribe {
    this._gameOverListeners.add(cb);
    return () => this._gameOverListeners.delete(cb);
  }

  public emitGameOver(wave: number): void {
    for (const cb of this._gameOverListeners) cb(wave);
  }

  public onWaveStarted(cb: (wave: number) => void): Unsubscribe {
    this._waveStartedListeners.add(cb);
    return () => this._waveStartedListeners.delete(cb);
  }

  public emitWaveStarted(wave: number): void {
    for (const cb of this._waveStartedListeners) cb(wave);
  }

  public onRestart(cb: () => void): Unsubscribe {
    this._restartListeners.add(cb);
    return () => this._restartListeners.delete(cb);
  }

  public emitRestart(): void {
    for (const cb of this._restartListeners) cb();
  }

  public onWaveAnnounceEnded(cb: () => void): Unsubscribe {
    this._waveAnnounceEndedListeners.add(cb);
    return () => this._waveAnnounceEndedListeners.delete(cb);
  }

  public emitWaveAnnounceEnded(): void {
    for (const cb of this._waveAnnounceEndedListeners) cb();
  }

  public onDirectionInput(cb: (dx: number, dy: number) => void): Unsubscribe {
    this._directionInputListeners.add(cb);
    return () => this._directionInputListeners.delete(cb);
  }

  public emitDirectionInput(dx: number, dy: number): void {
    for (const cb of this._directionInputListeners) cb(dx, dy);
  }
}
