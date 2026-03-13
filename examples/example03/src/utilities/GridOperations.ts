import { GameGrid, GameGridModel, GameGridEvents, GameGridView, DefaultGameGridAllocator, type IInstanceResolver, type ViewFactory } from "gamelabsjs";
import type { Example03Config } from "../Example03Config";

export class GridOperations {
  public static createGrid(
    model: GameGridModel,
    events: GameGridEvents,
    config: Example03Config,
    viewFactory: ViewFactory<IInstanceResolver>
  ): GameGridView {
    const allocator = new DefaultGameGridAllocator();
    const grid = new GameGrid(config.boardId, config.boardColumnCount, config.boardRowCount, events, null, allocator);
    model.addGrid(grid);
    const sampleItem = allocator.createItem({ id: 1 });
    const centerCol = Math.floor(config.boardColumnCount / 2);
    const centerRow = Math.floor(config.boardRowCount / 2);
    grid.setCellItem(centerCol, centerRow, sampleItem);
    return viewFactory.createView(GameGridView, null);
  }
}
