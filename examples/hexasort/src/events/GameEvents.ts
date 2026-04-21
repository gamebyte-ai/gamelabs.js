import type { Unsubscribe } from "@gamebyte/gamelabsjs";
import type { BlockStack } from "../models/BlockStack.js";

/**
 * Cross-controller game events for drag-and-drop orchestration.
 *
 * - `onStackPickedUp`   — Stacks tray → grid: a stack is being dragged.
 *   Grid controller uses this to suppress rotation and enter "drop mode".
 * - `onStackReleased`   — Stacks tray → grid: the pointer was released.
 *   Grid controller decides whether the current hover is a valid drop.
 * - `onStackPlaced`     — Grid → stacks tray: a stack was written into a
 *   cell and should be removed from its tray slot.
 * - `onStackDropCancelled` — Grid → stacks tray: the drop was not valid.
 *   Stacks tray returns the stack to its slot.
 */
export class GameEvents {
  private readonly _pickedUp = new Set<(stack: BlockStack) => void>();
  private readonly _released = new Set<() => void>();
  private readonly _placed = new Set<(stack: BlockStack, col: number, row: number) => void>();
  private readonly _dropCancelled = new Set<(stack: BlockStack) => void>();

  public onStackPickedUp(cb: (stack: BlockStack) => void): Unsubscribe {
    this._pickedUp.add(cb);
    return () => this._pickedUp.delete(cb);
  }

  public emitStackPickedUp(stack: BlockStack): void {
    for (const cb of this._pickedUp) cb(stack);
  }

  public onStackReleased(cb: () => void): Unsubscribe {
    this._released.add(cb);
    return () => this._released.delete(cb);
  }

  public emitStackReleased(): void {
    for (const cb of this._released) cb();
  }

  public onStackPlaced(cb: (stack: BlockStack, col: number, row: number) => void): Unsubscribe {
    this._placed.add(cb);
    return () => this._placed.delete(cb);
  }

  public emitStackPlaced(stack: BlockStack, col: number, row: number): void {
    for (const cb of this._placed) cb(stack, col, row);
  }

  public onStackDropCancelled(cb: (stack: BlockStack) => void): Unsubscribe {
    this._dropCancelled.add(cb);
    return () => this._dropCancelled.delete(cb);
  }

  public emitStackDropCancelled(stack: BlockStack): void {
    for (const cb of this._dropCancelled) cb(stack);
  }
}
