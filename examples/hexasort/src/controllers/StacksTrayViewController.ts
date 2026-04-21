import { UnsubscribeBag, type IInstanceResolver, type IViewController } from "@gamebyte/gamelabsjs";
import { IStacksTray } from "../models/IStacksTray.js";
import { GameEvents } from "../events/GameEvents.js";
import { GameOperations } from "../utilities/GameOperations.js";
import type { IStacksTrayView } from "../views/IStacksTrayView.js";

/**
 * Stacks-tray-side drag & drop orchestration.
 *
 * - builds the tray from the {@link IStacksTray} model (readonly),
 * - on a stack press, emits `onStackPickedUp` so the grid can enter drop
 *   mode and highlight targets,
 * - on pointer release, emits `onStackReleased`; the grid decides whether
 *   to place or cancel and emits back,
 * - on a successful placement, removes the consumed slot's visual and
 *   asks `GameOperations` to mint a fresh stack into the same slot,
 * - on a cancelled drop, resets the stack visual to its home.
 *
 * Never holds the mutable {@link StacksTray} — all slot writes go through
 * {@link GameOperations.refillTraySlot}.
 */
export class StacksTrayViewController implements IViewController<IStacksTrayView> {
  private _tray: IStacksTray | null = null;
  private _events: GameEvents | null = null;
  private _ops: GameOperations | null = null;
  private _view: IStacksTrayView | null = null;
  private _activeSlot: number | null = null;
  private readonly _subs = new UnsubscribeBag();

  public inject(resolver: IInstanceResolver): void {
    this._tray = resolver.getInstance(IStacksTray);
    this._events = resolver.getInstance(GameEvents);
    this._ops = resolver.getInstance(GameOperations);
  }

  public initialize(view: IStacksTrayView): void {
    if (!this._tray || !this._events || !this._ops) throw new Error("StacksTrayViewController is not initialized");
    this._view = view;

    const initialSlots: (ReturnType<IStacksTray["getSlot"]>)[] = [];
    for (let i = 0; i < this._tray.slotCount; i++) initialSlots.push(this._tray.getSlot(i));
    view.buildTray(initialSlots);

    this._subs.add(view.onStackPressed((slotIndex) => this._handleStackPressed(slotIndex)));
    this._subs.add(view.onPointerReleased(() => this._handlePointerReleased()));
    this._subs.add(this._events.onStackPlaced((_stack, _col, _row) => this._handleStackPlaced()));
    this._subs.add(this._events.onStackDropCancelled(() => this._handleStackDropCancelled()));
  }

  public destroy(): void {
    this._subs.flush();
    this._view = null;
    this._tray = null;
    this._events = null;
    this._ops = null;
    this._activeSlot = null;
  }

  private _handleStackPressed(slotIndex: number): void {
    if (!this._tray || !this._events) return;
    const stack = this._tray.getSlot(slotIndex);
    if (!stack) return;
    this._activeSlot = slotIndex;
    this._events.emitStackPickedUp(stack);
  }

  private _handlePointerReleased(): void {
    if (this._activeSlot === null || !this._events) return;
    this._events.emitStackReleased();
  }

  private _handleStackPlaced(): void {
    if (this._activeSlot === null || !this._view || !this._ops) return;
    const slotIndex = this._activeSlot;
    this._activeSlot = null;

    this._view.removeSlotVisual(slotIndex);
    const replacement = this._ops.refillTraySlot(slotIndex);
    this._view.addSlotStack(slotIndex, replacement);
  }

  private _handleStackDropCancelled(): void {
    if (this._activeSlot === null || !this._view) return;
    this._view.resetSlotVisual(this._activeSlot);
    this._activeSlot = null;
  }
}
