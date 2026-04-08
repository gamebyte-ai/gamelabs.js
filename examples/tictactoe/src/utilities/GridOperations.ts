import { Grid, GridsModel, GridEvents, type IInstanceResolver, type IInjectionTarget } from "@gamebyte/gamelabsjs";
import { TicTacToeConfig } from "../TicTacToeConfig";
import { GameGridAllocator } from "./GameGridAllocator.js";

export class GridOperations implements IInjectionTarget {
  private _model: GridsModel | null = null;
  private _events: GridEvents | null = null;
  private _config: TicTacToeConfig | null = null;

  public inject(resolver: IInstanceResolver): void {
    this._model = resolver.getInstance(GridsModel);
    this._events = resolver.getInstance(GridEvents);
    this._config = resolver.getInstance(TicTacToeConfig);
  }

  public createGrid(): void {
    const model = this._model!;
    const events = this._events!;
    const config = this._config!;
    const allocator = new GameGridAllocator();
    const grid = new Grid(config.boardId, config.boardColumnCount, config.boardRowCount, events, null, allocator);
    model.addGrid(grid);
  }
}
