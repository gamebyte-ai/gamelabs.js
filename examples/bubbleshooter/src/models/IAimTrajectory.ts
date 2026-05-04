/**
 * Read-only trajectory shape produced by `AimTrajectoryCalculator` and
 * consumed by views (aim-line rendering) and events (aim-trajectory
 * announcements). Lives in `models/` so neither views nor events have
 * to reach into `utilities/` for type-only imports.
 */

export interface IAimTrajectorySegment {
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
}

export type AimTrajectoryEnd = "top" | "bubble" | "max-bounces" | "none";

export interface IAimLanding {
  readonly row: number;
  readonly col: number;
  readonly worldX: number;
  readonly worldY: number;
}

export interface IAimTrajectory {
  readonly segments: readonly IAimTrajectorySegment[];
  readonly end: AimTrajectoryEnd;
  /** Empty cell where the fired bubble would settle, or null if no valid one. */
  readonly landing: IAimLanding | null;
}
