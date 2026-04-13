import type { ActiveEnemy, IGameModel } from "./IGameModel.js";

export class GameModel implements IGameModel {
  private _playerX = 0;
  private _playerY = 0;
  private _enemies: ActiveEnemy[] = [];
  private _gameOver = false;
  private _nextEnemyId = 1;

  public get playerX(): number {
    return this._playerX;
  }

  public get playerY(): number {
    return this._playerY;
  }

  public get enemies(): readonly ActiveEnemy[] {
    return this._enemies;
  }

  public get mutableEnemies(): ActiveEnemy[] {
    return this._enemies;
  }

  public get gameOver(): boolean {
    return this._gameOver;
  }

  public get nextEnemyId(): number {
    return this._nextEnemyId++;
  }

  public setPlayerPosition(x: number, y: number): void {
    this._playerX = x;
    this._playerY = y;
  }

  public setGameOver(value: boolean): void {
    this._gameOver = value;
  }

  public addEnemy(enemy: ActiveEnemy): void {
    this._enemies.push(enemy);
  }

  public removeEnemy(id: number): void {
    this._enemies = this._enemies.filter((e) => e.id !== id);
  }

  public clearEnemies(): void {
    this._enemies = [];
  }

  public reset(centerX: number, centerY: number): void {
    this._playerX = centerX;
    this._playerY = centerY;
    this._gameOver = false;
    this._enemies = [];
    this._nextEnemyId = 1;
  }
}
