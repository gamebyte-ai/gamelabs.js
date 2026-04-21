import type { Unsubscribe } from "@gamebyte/gamelabsjs";
import type { TowerTypeId } from "../constants/TowerTypeDef.js";

/**
 * Cross-feature events for the tower defense game.
 * Controllers emit these; other controllers or views subscribe.
 */
export class GameEvents {
  // --- Cell selection ---
  private readonly _cellSelectedListeners = new Set<(col: number, row: number) => void>();

  public onCellSelected(cb: (col: number, row: number) => void): Unsubscribe {
    this._cellSelectedListeners.add(cb);
    return () => { this._cellSelectedListeners.delete(cb); };
  }

  public emitCellSelected(col: number, row: number): void {
    for (const cb of this._cellSelectedListeners) cb(col, row);
  }

  // --- Tower placed ---
  private readonly _towerPlacedListeners = new Set<(col: number, row: number, towerType: TowerTypeId) => void>();

  public onTowerPlaced(cb: (col: number, row: number, towerType: TowerTypeId) => void): Unsubscribe {
    this._towerPlacedListeners.add(cb);
    return () => { this._towerPlacedListeners.delete(cb); };
  }

  public emitTowerPlaced(col: number, row: number, towerType: TowerTypeId): void {
    for (const cb of this._towerPlacedListeners) cb(col, row, towerType);
  }

  // --- Level teardown (fires BEFORE path mutation) ---
  private readonly _teardownLevelListeners = new Set<() => void>();

  public onTeardownLevel(cb: () => void): Unsubscribe {
    this._teardownLevelListeners.add(cb);
    return () => { this._teardownLevelListeners.delete(cb); };
  }

  public emitTeardownLevel(): void {
    for (const cb of this._teardownLevelListeners) cb();
  }

  // --- Level generated (fires AFTER new path + state are ready) ---
  private readonly _levelGeneratedListeners = new Set<() => void>();

  public onLevelGenerated(cb: () => void): Unsubscribe {
    this._levelGeneratedListeners.add(cb);
    return () => { this._levelGeneratedListeners.delete(cb); };
  }

  public emitLevelGenerated(): void {
    for (const cb of this._levelGeneratedListeners) cb();
  }

  // --- Placement mode ---
  private readonly _startPlacementListeners = new Set<(towerType: TowerTypeId) => void>();

  public onStartPlacement(cb: (towerType: TowerTypeId) => void): Unsubscribe {
    this._startPlacementListeners.add(cb);
    return () => { this._startPlacementListeners.delete(cb); };
  }

  public emitStartPlacement(towerType: TowerTypeId): void {
    for (const cb of this._startPlacementListeners) cb(towerType);
  }

  private readonly _cancelPlacementListeners = new Set<() => void>();

  public onCancelPlacement(cb: () => void): Unsubscribe {
    this._cancelPlacementListeners.add(cb);
    return () => { this._cancelPlacementListeners.delete(cb); };
  }

  public emitCancelPlacement(): void {
    for (const cb of this._cancelPlacementListeners) cb();
  }

  // --- Cannon fired (for barrel recoil animation) ---
  private readonly _cannonFiredListeners = new Set<(towerCol: number, towerRow: number, targetX: number, targetZ: number) => void>();

  public onCannonFired(cb: (towerCol: number, towerRow: number, targetX: number, targetZ: number) => void): Unsubscribe {
    this._cannonFiredListeners.add(cb);
    return () => { this._cannonFiredListeners.delete(cb); };
  }

  public emitCannonFired(towerCol: number, towerRow: number, targetX: number, targetZ: number): void {
    for (const cb of this._cannonFiredListeners) cb(towerCol, towerRow, targetX, targetZ);
  }

  // --- Enemy killed (by damage, not by reaching base or level clear) ---
  private readonly _enemyKilledListeners = new Set<(reward: number, worldX: number, worldZ: number) => void>();

  public onEnemyKilled(cb: (reward: number, worldX: number, worldZ: number) => void): Unsubscribe {
    this._enemyKilledListeners.add(cb);
    return () => { this._enemyKilledListeners.delete(cb); };
  }

  public emitEnemyKilled(reward: number, worldX: number, worldZ: number): void {
    for (const cb of this._enemyKilledListeners) cb(reward, worldX, worldZ);
  }

  // --- Gold changed (total gold after the change) ---
  private readonly _goldChangedListeners = new Set<(total: number) => void>();

  public onGoldChanged(cb: (total: number) => void): Unsubscribe {
    this._goldChangedListeners.add(cb);
    return () => { this._goldChangedListeners.delete(cb); };
  }

  public emitGoldChanged(total: number): void {
    for (const cb of this._goldChangedListeners) cb(total);
  }

  // --- Enemy reached base ---
  private readonly _enemyReachedBaseListeners = new Set<(damage: number) => void>();

  public onEnemyReachedBase(cb: (damage: number) => void): Unsubscribe {
    this._enemyReachedBaseListeners.add(cb);
    return () => { this._enemyReachedBaseListeners.delete(cb); };
  }

  public emitEnemyReachedBase(damage: number): void {
    for (const cb of this._enemyReachedBaseListeners) cb(damage);
  }

  // --- Wave started ---
  private readonly _waveStartedListeners = new Set<(wave: number) => void>();

  public onWaveStarted(cb: (wave: number) => void): Unsubscribe {
    this._waveStartedListeners.add(cb);
    return () => { this._waveStartedListeners.delete(cb); };
  }

  public emitWaveStarted(wave: number): void {
    for (const cb of this._waveStartedListeners) cb(wave);
  }

  // --- Wave completed ---
  private readonly _waveCompletedListeners = new Set<(wave: number) => void>();

  public onWaveCompleted(cb: (wave: number) => void): Unsubscribe {
    this._waveCompletedListeners.add(cb);
    return () => { this._waveCompletedListeners.delete(cb); };
  }

  public emitWaveCompleted(wave: number): void {
    for (const cb of this._waveCompletedListeners) cb(wave);
  }
}
