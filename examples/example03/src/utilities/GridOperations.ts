import { GameGrid, GameGridModel, GameGridEvents, GameGridView, DefaultGameGridAllocator, type IInstanceResolver, type IInjectionTarget } from "gamelabsjs";
import { Example03Config } from "../Example03Config";

export class GridOperations implements IInjectionTarget {
  private _model: GameGridModel | null = null;
  private _events: GameGridEvents | null = null;
  private _config: Example03Config | null = null;

  public inject(resolver: IInstanceResolver): void {
    this._model = resolver.getInstance(GameGridModel);
    this._events = resolver.getInstance(GameGridEvents);
    this._config = resolver.getInstance(Example03Config);
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
