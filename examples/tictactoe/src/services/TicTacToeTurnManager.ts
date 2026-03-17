import { InjectionToken, type Unsubscribe } from "gamelabsjs";
import { GridsModel } from "gamelabsjs";
import { GameGridAllocator } from "../utilities/GameGridAllocator.js";
import { Team } from "../models/GameItem.js";
import { TicTacToeConfig } from "../TicTacToeConfig.js";

export const TicTacToeTurnManagerToken = new InjectionToken<TicTacToeTurnManager>("TicTacToeTurnManager");

export class TicTacToeTurnManager {
  private _model: GridsModel | null = null;
  private _config: TicTacToeConfig | null = null;
  private readonly _allocator = new GameGridAllocator();
  private _currentTeam: Team = Team.X;
  private _nextItemId = 1;
  private readonly _turnChangedListeners = new Set<(team: Team) => void>();

  public inject(resolver: { getInstance: (token: unknown) => unknown }): void {
    this._model = resolver.getInstance(GridsModel) as GridsModel;
    this._config = resolver.getInstance(TicTacToeConfig) as TicTacToeConfig;
  }

  public get currentTeam(): Team {
    return this._currentTeam;
  }

  public onTurnChanged(cb: (team: Team) => void): Unsubscribe {
    this._turnChangedListeners.add(cb);
    return () => this._turnChangedListeners.delete(cb);
  }

  public placeMark(gridId: number, col: number, row: number): boolean {
    const grid = this._model?.getGrid(gridId);
    if (!grid || gridId !== this._config?.boardId) return false;

    const cell = grid.getCell(col, row);
    if (!cell || cell.item) return false;

    const item = this._allocator.createItem({ id: this._nextItemId++, team: this._currentTeam }) as import("../models/GameItem.js").GameItem;
    grid.setCellItem(col, row, item);

    this._currentTeam = this._currentTeam === Team.X ? Team.O : Team.X;
    for (const cb of this._turnChangedListeners) cb(this._currentTeam);
    return true;
  }
}
