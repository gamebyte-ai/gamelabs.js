import { InjectionToken, type IInstanceResolver } from "gamelabsjs";
import { GridsModel } from "gamelabsjs";
import { GameGridAllocator } from "./GameGridAllocator.js";
import { GameItem, Team } from "../models/GameItem.js";
import { TicTacToeConfig } from "../TicTacToeConfig.js";
import { TurnEvents } from "../events/TurnEvents.js";

export const TicTacToeTurnManagerToken = new InjectionToken<TicTacToeTurnManager>("TicTacToeTurnManager");

export class TicTacToeTurnManager {
  private _model: GridsModel | null = null;
  private _config: TicTacToeConfig | null = null;
  private _turnEvents: TurnEvents | null = null;
  private readonly _allocator = new GameGridAllocator();
  private _currentTeam: Team = Team.X;
  private _nextItemId = 1;
  private _gameOver = false;
  private _winner: Team | null = null;

  public inject(resolver: IInstanceResolver): void {
    this._model = resolver.getInstance(GridsModel);
    this._config = resolver.getInstance(TicTacToeConfig);
    this._turnEvents = resolver.getInstance(TurnEvents);
  }

  public get currentTeam(): Team {
    return this._currentTeam;
  }

  public get winner(): Team | null {
    return this._winner;
  }

  public placeMark(gridId: number, col: number, row: number): boolean {
    if (this._gameOver) return false;

    const grid = this._model?.getGrid(gridId);
    if (!grid || gridId !== this._config?.boardId) return false;

    const cell = grid.getCell(col, row);
    if (!cell || cell.item) return false;

    const placedTeam = this._currentTeam;
    const item = this._allocator.createItem({ id: this._nextItemId++, team: placedTeam }) as GameItem;
    grid.setCellItem(col, row, item);

    const winner = this.checkWinner(gridId);
    if (winner) {
      this._gameOver = true;
      this._winner = winner;
      this._turnEvents?.emitGameWon(winner);
      return true;
    }

    if (this.isBoardFull(gridId)) {
      this._gameOver = true;
      this._winner = null;
      this._turnEvents?.emitGameDraw();
      return true;
    }

    this._currentTeam = this._currentTeam === Team.X ? Team.O : Team.X;
    this._turnEvents?.emitTurnChanged(this._currentTeam);
    return true;
  }

  public restart(): void {
    const grid = this._model?.getGrid(this._config?.boardId ?? -1);
    if (!grid) return;

    for (let col = 0; col < grid.columnCount; col++) {
      for (let row = 0; row < grid.rowCount; row++) {
        if (grid.getCell(col, row)?.item) {
          grid.setCellItem(col, row, null);
        }
      }
    }

    this._currentTeam = Team.X;
    this._gameOver = false;
    this._winner = null;
    this._turnEvents?.emitGameRestarted();
    this._turnEvents?.emitTurnChanged(this._currentTeam);
  }

  private checkWinner(gridId: number): Team | null {
    const grid = this._model?.getGrid(gridId);
    if (!grid) return null;

    const cols = grid.columnCount;
    const rows = grid.rowCount;

    const getTeam = (col: number, row: number): Team | null => {
      const item = grid.getCell(col, row)?.item;
      return item instanceof GameItem ? item.team : null;
    };

    // Check rows
    for (let row = 0; row < rows; row++) {
      const team = getTeam(0, row);
      if (team && this.allMatch(team, cols, (i) => getTeam(i, row))) return team;
    }

    // Check columns
    for (let col = 0; col < cols; col++) {
      const team = getTeam(col, 0);
      if (team && this.allMatch(team, rows, (i) => getTeam(col, i))) return team;
    }

    // Check diagonals (only for square boards)
    if (cols === rows) {
      const tl = getTeam(0, 0);
      if (tl && this.allMatch(tl, cols, (i) => getTeam(i, i))) return tl;

      const tr = getTeam(cols - 1, 0);
      if (tr && this.allMatch(tr, cols, (i) => getTeam(cols - 1 - i, i))) return tr;
    }

    return null;
  }

  private allMatch(team: Team, count: number, getter: (i: number) => Team | null): boolean {
    for (let i = 0; i < count; i++) {
      if (getter(i) !== team) return false;
    }
    return true;
  }

  private isBoardFull(gridId: number): boolean {
    const grid = this._model?.getGrid(gridId);
    if (!grid) return false;

    for (let col = 0; col < grid.columnCount; col++) {
      for (let row = 0; row < grid.rowCount; row++) {
        if (!grid.getCell(col, row)?.item) return false;
      }
    }
    return true;
  }
}
