import { GameGrid, GameGridModel, GameGridEvents, DefaultGameGridAllocator, type IInstanceResolver, type IInjectionTarget } from "gamelabsjs";
import { TicTacToeConfig } from "../TicTacToeConfig";

export class GridOperations implements IInjectionTarget {
  private _model: GameGridModel | null = null;
  private _events: GameGridEvents | null = null;
  private _config: TicTacToeConfig | null = null;

  public inject(resolver: IInstanceResolver): void {
    this._model = resolver.getInstance(GameGridModel);
    this._events = resolver.getInstance(GameGridEvents);
    this._config = resolver.getInstance(TicTacToeConfig);
  }

  public createGrid(): void {
    const model = this._model!;
    const events = this._events!;
    const config = this._config!;
    const allocator = new DefaultGameGridAllocator();
    const grid = new GameGrid(config.boardId, config.boardColumnCount, config.boardRowCount, events, null, allocator);
    model.addGrid(grid);
  }
}
