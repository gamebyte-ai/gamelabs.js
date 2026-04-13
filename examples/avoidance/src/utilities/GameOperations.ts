import type { IInstanceResolver, IInjectionTarget } from "@gamebyte/gamelabsjs";
import { AvoidanceConfig } from "../AvoidanceConfig.js";
import { GameModel } from "../models/GameModel.js";
import type { ActiveEnemy } from "../models/IGameModel.js";
import { GameEvents } from "../events/GameEvents.js";
import type { EnemySpawn } from "./WaveManager.js";
import { WaveManager } from "./WaveManager.js";

export class GameOperations implements IInjectionTarget {
  private _config: AvoidanceConfig | null = null;
  private _model: GameModel | null = null;
  private _gameEvents: GameEvents | null = null;
  private _waveManager: WaveManager | null = null;
  private _inputDx = 0;
  private _inputDy = 0;
  private _wasAnnouncing = false;

  public inject(resolver: IInstanceResolver): void {
    this._config = resolver.getInstance(AvoidanceConfig);
    this._model = resolver.getInstance(GameModel);
    this._gameEvents = resolver.getInstance(GameEvents);
    this._waveManager = resolver.getInstance(WaveManager);
  }

  public setInput(dx: number, dy: number): void {
    this._inputDx = dx;
    this._inputDy = dy;
  }

  public startGame(): void {
    const area = this._config!.gameAreaSize;
    this._model!.reset(area / 2, area / 2);
    this._wasAnnouncing = false;
    this._waveManager!.start();
  }

  public restart(): void {
    this.startGame();
  }

  public update(dt: number): void {
    if (!this._model || this._model.gameOver) return;

    this._updatePlayer(dt);
    this._spawnEnemies(dt);
    this._updateEnemies(dt);
    this._checkCollisions();
  }

  private _updatePlayer(dt: number): void {
    const config = this._config!;
    const model = this._model!;
    let dx = this._inputDx;
    let dy = this._inputDy;

    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    let px = model.playerX + dx * config.playerSpeed * dt;
    let py = model.playerY + dy * config.playerSpeed * dt;

    const half = config.playerSize / 2;
    const area = config.gameAreaSize;
    px = Math.max(half, Math.min(area - half, px));
    py = Math.max(half, Math.min(area - half, py));

    model.setPlayerPosition(px, py);
  }

  private _spawnEnemies(dt: number): void {
    const isAnnouncing = this._waveManager!.state === "announcing";
    if (this._wasAnnouncing && !isAnnouncing) {
      this._gameEvents?.emitWaveAnnounceEnded();
    }
    this._wasAnnouncing = isAnnouncing;

    const spawn = this._waveManager!.update(dt);
    if (spawn) this._addEnemy(spawn);
  }

  private _addEnemy(spawn: EnemySpawn): void {
    const model = this._model!;
    const id = model.nextEnemyId;
    const dx = spawn.endX - spawn.startX;
    const dy = spawn.endY - spawn.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;

    model.addEnemy({
      id,
      x: spawn.startX,
      y: spawn.startY,
      dx: dx / dist,
      dy: dy / dist,
      speed: spawn.speed,
      totalDist: dist,
      traveled: 0,
    });
  }

  private _updateEnemies(dt: number): void {
    const model = this._model!;
    const toRemove: number[] = [];

    for (const e of model.mutableEnemies) {
      const step = e.speed * dt;
      e.x += e.dx * step;
      e.y += e.dy * step;
      e.traveled += step;
      if (e.traveled >= e.totalDist) toRemove.push(e.id);
    }

    for (const id of toRemove) {
      model.removeEnemy(id);
    }

    if (model.enemies.length === 0) {
      this._waveManager?.notifyAllEnemiesCleared();
    }
  }

  private _checkCollisions(): void {
    const config = this._config!;
    const model = this._model!;
    const shrink = config.collisionShrink;
    const playerR = (config.playerSize / 2) * shrink;

    for (const e of model.enemies) {
      const enemyR = (config.enemySize / 2) * shrink;
      const dx = model.playerX - e.x;
      const dy = model.playerY - e.y;
      if (Math.sqrt(dx * dx + dy * dy) < playerR + enemyR) {
        model.setGameOver(true);
        this._waveManager?.stop();
        this._gameEvents?.emitGameOver(this._waveManager?.currentWave ?? 0);
        return;
      }
    }
  }
}
