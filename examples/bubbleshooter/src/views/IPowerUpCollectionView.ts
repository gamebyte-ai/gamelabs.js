import type { IView } from "@gamebyte/gamelabsjs";
import type { PowerUpKind } from "../events/GameEvents";

/**
 * In-flight power-up collection icons. Each spawned icon flies from
 * its grid-cell origin to the matching HUD button (read from
 * `PowerUpButtonTargets` whenever the flight starts) over
 * `BubbleShooterConfig.powerUpCollectDurationSeconds` with a cubic
 * ease-in profile — slow start, fast finish. Icons remove themselves
 * when their per-flight timer expires; the model bumps inventory at
 * the same instant via `_tickCollections`.
 */
export interface IPowerUpCollectionView extends IView {
  /**
   * Start a new collection flight. Re-reads the button target world
   * position right when the flight begins, so a button reposition
   * (resize / level layout change) doesn't yank a mid-flight icon.
   */
  spawn(kind: PowerUpKind, fromX: number, fromY: number): void;
  /** Per-frame animation tick. Driven by the controller via UpdateManager. */
  tick(dt: number): void;
  /** Drop every in-flight icon. Called on level reload. */
  clearAll(): void;
}
