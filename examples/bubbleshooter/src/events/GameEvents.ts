import type { Unsubscribe } from "@gamebyte/gamelabsjs";
import type { BubbleColor } from "../constants/BubbleColor";
import type { IAimTrajectory } from "../utilities/AimTrajectoryCalculator";

type BubblePlacedCb = (row: number, col: number, color: BubbleColor) => void;
type BubbleRemovedCb = (row: number, col: number) => void;
type ShooterColorCb = (color: BubbleColor | null) => void;
type ShooterAimCb = (angle: number) => void;
type AimTrajectoryCb = (trajectory: IAimTrajectory) => void;
type FlyingBubbleCb = (color: BubbleColor | null, x: number, y: number) => void;
type BubblePoppedCb = (x: number, y: number, color: BubbleColor) => void;
type FallingBubbleCb = (id: number, color: BubbleColor | null, x: number, y: number) => void;
type ScoreCb = (value: number) => void;

export class GameEvents {
  private readonly _bubblePlacedListeners = new Set<BubblePlacedCb>();
  private readonly _bubbleRemovedListeners = new Set<BubbleRemovedCb>();
  private readonly _shooterColorListeners = new Set<ShooterColorCb>();
  private readonly _shooterNextColorListeners = new Set<ShooterColorCb>();
  private readonly _shooterAimListeners = new Set<ShooterAimCb>();
  private readonly _aimTrajectoryListeners = new Set<AimTrajectoryCb>();
  private readonly _flyingBubbleListeners = new Set<FlyingBubbleCb>();
  private readonly _bubblePoppedListeners = new Set<BubblePoppedCb>();
  private readonly _fallingBubbleListeners = new Set<FallingBubbleCb>();
  private readonly _scoreListeners = new Set<ScoreCb>();

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

  /**
   * A bubble popped — used by the view to drive the particle-burst
   * animation. Carries world coordinates so it works for both cluster
   * pops (`x`, `y` resolved from grid cell) and falling-bubble pops
   * (`x`, `y` taken from the bubble's mid-air position).
   *
   * For cluster pops, fires *in addition to* `onBubbleRemoved` so the
   * view can split visual concerns from the grid mutation.
   */
  public onBubblePopped(cb: BubblePoppedCb): Unsubscribe {
    this._bubblePoppedListeners.add(cb);
    return () => this._bubblePoppedListeners.delete(cb);
  }

  public emitBubblePopped(x: number, y: number, color: BubbleColor): void {
    for (const cb of this._bubblePoppedListeners) cb(x, y, color);
  }

  /**
   * Falling-bubble lifecycle. `color !== null` means spawn-or-update at
   * `(x, y)`; `color === null` means the falling bubble is gone (popped
   * at the threshold or otherwise) and the view should remove its mesh.
   */
  public onFallingBubbleChanged(cb: FallingBubbleCb): Unsubscribe {
    this._fallingBubbleListeners.add(cb);
    return () => this._fallingBubbleListeners.delete(cb);
  }

  public emitFallingBubbleChanged(id: number, color: BubbleColor | null, x: number, y: number): void {
    for (const cb of this._fallingBubbleListeners) cb(id, color, x, y);
  }

  public onScoreChanged(cb: ScoreCb): Unsubscribe {
    this._scoreListeners.add(cb);
    return () => this._scoreListeners.delete(cb);
  }

  public emitScoreChanged(value: number): void {
    for (const cb of this._scoreListeners) cb(value);
  }
}
