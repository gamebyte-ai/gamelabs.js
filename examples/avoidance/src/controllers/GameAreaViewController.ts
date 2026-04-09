import { UnsubscribeBag, UpdateManager, type IInstanceResolver, type IViewController, type Unsubscribe } from "gamelabsjs";
import type { IGameAreaView } from "../views/IGameAreaView";
import { AvoidanceConfig } from "../AvoidanceConfig.js";
import { GameEvents } from "../events/GameEvents.js";
import type { EnemySpawn } from "../utilities/WaveManager.js";
import { WaveManager } from "../utilities/WaveManager.js";

type ActiveEnemy = {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  speed: number;
  totalDist: number;
  traveled: number;
};

export class GameAreaViewController implements IViewController<IGameAreaView> {
  private _view: IGameAreaView | null = null;
  private readonly _subs = new UnsubscribeBag();
  private _config: AvoidanceConfig | null = null;
  private _updateManager: UpdateManager | null = null;
  private _gameEvents: GameEvents | null = null;
  private _waveManager: WaveManager | null = null;

  // Player state
  private _playerX = 0;
  private _playerY = 0;
  private _inputDx = 0;
  private _inputDy = 0;

  // Enemy state
  private _enemies: ActiveEnemy[] = [];
  private _nextEnemyId = 1;

  // Game state
  private _gameOver = false;
  private _wasAnnouncing = false;
  private _updateUnsub: Unsubscribe | null = null;

  public inject(resolver: IInstanceResolver): void {
    this._config = resolver.getInstance(AvoidanceConfig);
    this._updateManager = resolver.getInstance(UpdateManager);
    this._gameEvents = resolver.getInstance(GameEvents);
    this._waveManager = resolver.getInstance(WaveManager);
  }

  public initialize(view: IGameAreaView): void {
    this._view = view;

    this._subs.add(this._gameEvents!.onDirectionInput((dx, dy) => {
      this._inputDx = dx;
      this._inputDy = dy;
    }));

    this._subs.add(this._gameEvents!.onRestart(() => {
      this.restart();
    }));

    this._updateUnsub = this._updateManager!.register((dt) => this.update(dt));

    this.startGame();
  }

  private startGame(): void {
    const area = this._config!.gameAreaSize;
    this._playerX = area / 2;
    this._playerY = area / 2;
    this._gameOver = false;
    this._wasAnnouncing = false;
    this._enemies = [];
    this._nextEnemyId = 1;
    this._view?.setPlayerPosition(this._playerX, this._playerY);
    this._waveManager!.start();
  }

  private restart(): void {
    this._view?.removeAllEnemies();
    this.startGame();
  }

  private update(dt: number): void {
    if (this._gameOver) return;

    this.updatePlayer(dt);
    this.spawnEnemies(dt);
    this.updateEnemies(dt);
    this.checkCollisions();
  }

  private updatePlayer(dt: number): void {
    const config = this._config!;
    let dx = this._inputDx;
    let dy = this._inputDy;

    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    this._playerX += dx * config.playerSpeed * dt;
    this._playerY += dy * config.playerSpeed * dt;

    const half = config.playerSize / 2;
    const area = config.gameAreaSize;
    this._playerX = Math.max(half, Math.min(area - half, this._playerX));
    this._playerY = Math.max(half, Math.min(area - half, this._playerY));

    this._view?.setPlayerPosition(this._playerX, this._playerY);
  }

  private spawnEnemies(dt: number): void {
    const isAnnouncing = this._waveManager!.state === "announcing";
    if (this._wasAnnouncing && !isAnnouncing) {
      this._gameEvents?.emitWaveAnnounceEnded();
    }
    this._wasAnnouncing = isAnnouncing;

    const spawn = this._waveManager!.update(dt);
    if (spawn) this.addEnemy(spawn);
  }

  private addEnemy(spawn: EnemySpawn): void {
    const id = this._nextEnemyId++;
    const dx = spawn.endX - spawn.startX;
    const dy = spawn.endY - spawn.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;

    this._enemies.push({
      id, x: spawn.startX, y: spawn.startY,
      dx: dx / dist, dy: dy / dist,
      speed: spawn.speed, totalDist: dist, traveled: 0,
    });
    this._view?.addEnemy(id, spawn.startX, spawn.startY);
  }

  private updateEnemies(dt: number): void {
    const toRemove: number[] = [];

    for (const e of this._enemies) {
      const step = e.speed * dt;
      e.x += e.dx * step;
      e.y += e.dy * step;
      e.traveled += step;
      this._view?.setEnemyPosition(e.id, e.x, e.y);
      if (e.traveled >= e.totalDist) toRemove.push(e.id);
    }

    for (const id of toRemove) {
      this._view?.removeEnemy(id);
      this._enemies = this._enemies.filter(e => e.id !== id);
    }

    if (this._enemies.length === 0) {
      this._waveManager?.notifyAllEnemiesCleared();
    }
  }

  private checkCollisions(): void {
    const config = this._config!;
    const shrink = config.collisionShrink;
    const playerR = (config.playerSize / 2) * shrink;

    for (const e of this._enemies) {
      const enemyR = (config.enemySize / 2) * shrink;
      const dx = this._playerX - e.x;
      const dy = this._playerY - e.y;
      if (Math.sqrt(dx * dx + dy * dy) < playerR + enemyR) {
        this._gameOver = true;
        this._waveManager?.stop();
        this._gameEvents?.emitGameOver(this._waveManager?.currentWave ?? 0);
        return;
      }
    }
  }

  public destroy(): void {
    this._updateUnsub?.();
    this._updateUnsub = null;
    this._subs.flush();
    this._view = null;
    this._config = null;
    this._updateManager = null;
    this._gameEvents = null;
    this._waveManager = null;
    this._enemies = [];
  }
}
