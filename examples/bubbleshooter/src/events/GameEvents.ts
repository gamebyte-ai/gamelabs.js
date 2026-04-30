import type { Unsubscribe } from "@gamebyte/gamelabsjs";
import type { BubbleColor } from "../constants/BubbleColor";
import type { IAimTrajectory } from "../utilities/AimTrajectoryCalculator";

type BubblePlacedCb = (row: number, col: number, color: BubbleColor) => void;
type BubbleRemovedCb = (row: number, col: number) => void;
type ShooterColorCb = (color: BubbleColor | null) => void;
type ShooterAimCb = (angle: number) => void;
type AimTrajectoryCb = (trajectory: IAimTrajectory) => void;
type FlyingBubbleCb = (color: BubbleColor | null, x: number, y: number) => void;

export class GameEvents {
  private readonly _bubblePlacedListeners = new Set<BubblePlacedCb>();
  private readonly _bubbleRemovedListeners = new Set<BubbleRemovedCb>();
  private readonly _shooterColorListeners = new Set<ShooterColorCb>();
  private readonly _shooterNextColorListeners = new Set<ShooterColorCb>();
  private readonly _shooterAimListeners = new Set<ShooterAimCb>();
  private readonly _aimTrajectoryListeners = new Set<AimTrajectoryCb>();
  private readonly _flyingBubbleListeners = new Set<FlyingBubbleCb>();

  public onBubblePlaced(cb: BubblePlacedCb): Unsubscribe {
    this._bubblePlacedListeners.add(cb);
    return () => this._bubblePlacedListeners.delete(cb);
  }

  public emitBubblePlaced(row: number, col: number, color: BubbleColor): void {
    for (const cb of this._bubblePlacedListeners) cb(row, col, color);
  }

  public onBubbleRemoved(cb: BubbleRemovedCb): Unsubscribe {
    this._bubbleRemovedListeners.add(cb);
    return () => this._bubbleRemovedListeners.delete(cb);
  }

  public emitBubbleRemoved(row: number, col: number): void {
    for (const cb of this._bubbleRemovedListeners) cb(row, col);
  }

  public onShooterColorChanged(cb: ShooterColorCb): Unsubscribe {
    this._shooterColorListeners.add(cb);
    return () => this._shooterColorListeners.delete(cb);
  }

  public emitShooterColorChanged(color: BubbleColor | null): void {
    for (const cb of this._shooterColorListeners) cb(color);
  }

  public onShooterNextColorChanged(cb: ShooterColorCb): Unsubscribe {
    this._shooterNextColorListeners.add(cb);
    return () => this._shooterNextColorListeners.delete(cb);
  }

  public emitShooterNextColorChanged(color: BubbleColor | null): void {
    for (const cb of this._shooterNextColorListeners) cb(color);
  }

  public onShooterAimChanged(cb: ShooterAimCb): Unsubscribe {
    this._shooterAimListeners.add(cb);
    return () => this._shooterAimListeners.delete(cb);
  }

  public emitShooterAimChanged(angle: number): void {
    for (const cb of this._shooterAimListeners) cb(angle);
  }

  public onAimTrajectoryChanged(cb: AimTrajectoryCb): Unsubscribe {
    this._aimTrajectoryListeners.add(cb);
    return () => this._aimTrajectoryListeners.delete(cb);
  }

  public emitAimTrajectoryChanged(trajectory: IAimTrajectory): void {
    for (const cb of this._aimTrajectoryListeners) cb(trajectory);
  }

  public onFlyingBubbleChanged(cb: FlyingBubbleCb): Unsubscribe {
    this._flyingBubbleListeners.add(cb);
    return () => this._flyingBubbleListeners.delete(cb);
  }

  public emitFlyingBubbleChanged(color: BubbleColor | null, x: number, y: number): void {
    for (const cb of this._flyingBubbleListeners) cb(color, x, y);
  }
}
