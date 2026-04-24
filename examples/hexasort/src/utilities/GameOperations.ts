import type { IInjectionTarget, IInstanceResolver } from "@gamebyte/gamelabsjs";
import { HexGrid } from "../models/HexGrid.js";
import { StacksTray } from "../models/StacksTray.js";
import type { BlockStack } from "../models/BlockStack.js";
import { BlockStackOperations } from "./BlockStackOperations.js";

/**
 * In-domain operations that mutate game state.
 *
 * Controllers access models through readonly interfaces (`IHexGrid`,
 * `IStacksTray`) and call `GameOperations` for every mutation. This
 * keeps the controller layer free of domain logic and concentrates all
 * game-state writes in a single, unit-testable utility — per
 * DeveloperNotes.md "Where logic lives" (in-domain operations belong in
 * `utilities/` with the `*Operations` suffix).
 *
 * Holding the concrete mutable {@link HexGrid} / {@link StacksTray}
 * references here (not in controllers) is explicitly endorsed by the
 * rule: "The utility that owns the state exposes the readonly view."
 */
export class GameOperations implements IInjectionTarget {
  private _grid!: HexGrid;
  private _tray!: StacksTray;
  private _factory!: BlockStackOperations;

  public inject(resolver: IInstanceResolver): void {
    this._grid = resolver.getInstance(HexGrid);
    this._tray = resolver.getInstance(StacksTray);
    this._factory = resolver.getInstance(BlockStackOperations);
  }

  /**
   * Placement rule: a stack may be dropped on a valid, empty cell. The
   * cell must exist in the grid and hold no blocks.
   */
  public canPlaceStack(col: number, row: number): boolean {
    return this._grid.isValidCell(col, row) && this._grid.isEmpty(col, row);
  }

  /** Write a fresh block stack onto the hex grid at the given cell. */
  public placeStackOnGrid(col: number, row: number, stack: BlockStack): void {
    this._grid.placeStack(col, row, stack);
  }

  /**
   * Spawns a new random stack into the given tray slot and returns it so
   * the caller (tray controller) can hand it to the view.
   */
  public refillTraySlot(slotIndex: number): BlockStack {
    const replacement = this._factory.createRandomStack();
    this._tray.setSlot(slotIndex, replacement);
    return replacement;
  }
}
