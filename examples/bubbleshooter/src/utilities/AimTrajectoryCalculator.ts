import type { IInjectionTarget, IInstanceResolver } from "@gamebyte/gamelabsjs";
import { BubbleShooterConfig } from "../BubbleShooterConfig";
import { IBubbleGrid } from "../models/IBubbleGrid";
import { BubbleGridLayout } from "./BubbleGridLayout";

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

interface ICellPos {
  readonly x: number;
  readonly y: number;
}

const EMPTY_TRAJECTORY: IAimTrajectory = { segments: [], end: "none", landing: null };

/**
 * Pure ray-cast solver for the aim line. Marches from the shooter tip in
 * the aim direction, reflecting off the side walls, terminating at the
 * top wall or the first cluster bubble it would touch (centre-to-centre
 * distance ≤ 2r).
 *
 * Bubble-cluster intersection is a standard ray vs. circle test against
 * each occupied cell, treating the obstacle as a circle of radius `2r`
 * centred on the cell (so the entry point coincides with where the
 * flying bubble would actually settle against its target).
 */
export class AimTrajectoryCalculator implements IInjectionTarget {
  private _config: BubbleShooterConfig | null = null;
  private _layout: BubbleGridLayout | null = null;
  private _grid: IBubbleGrid | null = null;

  public inject(resolver: IInstanceResolver): void {
    this._config = resolver.getInstance(BubbleShooterConfig);
    this._layout = resolver.getInstance(BubbleGridLayout);
    this._grid = resolver.getInstance(IBubbleGrid);
  }

  public compute(angle: number): IAimTrajectory {
    const config = this._config;
    const layout = this._layout;
    const grid = this._grid;
    if (!config || !layout || !grid) return EMPTY_TRAJECTORY;

    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    if (dirY <= 0) return EMPTY_TRAJECTORY;

    let posX = layout.shooterX + dirX * config.shooterRadius;
    let posY = layout.shooterY + dirY * config.shooterRadius;

    let curDirX = dirX;
    let curDirY = dirY;

    const leftWall = layout.leftWallX;
    const rightWall = layout.rightWallX;
    const topWall = layout.topWallY;
    // Shrink the centre-to-centre collision threshold by the configured
    // tolerance so the flying bubble can squeeze through gaps slightly
    // tighter than `2 · bubbleRadius`. Clamp at 0 so an over-large
    // tolerance can't turn collisions inside-out.
    const collisionRadius = Math.max(0, 2 * config.bubbleRadius - config.bubbleCollisionTolerance);
    const collisionR2 = collisionRadius * collisionRadius;

    const cells = this._snapshotOccupiedCells(grid, layout);
    const segments: IAimTrajectorySegment[] = [];
    let end: AimTrajectoryEnd = "max-bounces";

    for (let bounce = 0; bounce <= config.aimMaxBounces; bounce++) {
      const wallHit = this._nearestWallHit(posX, posY, curDirX, curDirY, leftWall, rightWall, topWall);
      const bubbleHit = this._nearestBubbleHit(posX, posY, curDirX, curDirY, cells, collisionR2);

      let tHit = Infinity;
      let hitKind: "left" | "right" | "top" | "bubble" | "none" = "none";
      if (wallHit && wallHit.t < tHit) {
        tHit = wallHit.t;
        hitKind = wallHit.kind;
      }
      if (bubbleHit && bubbleHit.t < tHit) {
        tHit = bubbleHit.t;
        hitKind = "bubble";
      }
      if (hitKind === "none") {
        end = "max-bounces";
        break;
      }

      const endX = posX + curDirX * tHit;
      const endY = posY + curDirY * tHit;
      segments.push({ fromX: posX, fromY: posY, toX: endX, toY: endY });

      if (hitKind === "bubble") {
        end = "bubble";
        break;
      }
      if (hitKind === "top") {
        end = "top";
        break;
      }

      posX = endX;
      posY = endY;
      curDirX = -curDirX;
    }

    const landing = this._findLanding(segments, end, grid, layout, config.bubbleRadius);
    return { segments, end, landing };
  }

  /**
   * Snap the trajectory's end point to the closest empty grid cell. Only
   * meaningful when the trajectory ended on a real obstacle ("top" or
   * "bubble"); otherwise the bubble wouldn't actually land anywhere.
   *
   * Cells farther than one bubble diameter from the end point are
   * rejected — at that distance the snap would be visually nonsensical
   * (the cluster's geometry guarantees the true landing cell is closer
   * than this).
   */
  private _findLanding(
    segments: readonly IAimTrajectorySegment[],
    endKind: AimTrajectoryEnd,
    grid: IBubbleGrid,
    layout: BubbleGridLayout,
    bubbleRadius: number,
  ): IAimLanding | null {
    if (segments.length === 0) return null;
    if (endKind !== "top" && endKind !== "bubble") return null;

    const last = segments[segments.length - 1]!;
    const endX = last.toX;
    const endY = last.toY;
    const maxDist2 = (2 * bubbleRadius) ** 2;

    let bestDist2 = Infinity;
    let bestRow = -1;
    let bestCol = -1;
    let bestX = 0;
    let bestY = 0;

    for (let row = 0; row < grid.rowCount; row++) {
      const colCount = grid.getColumnCount(row);
      for (let col = 0; col < colCount; col++) {
        if (grid.isOccupied(row, col)) continue;
        const pos = layout.getCellWorldPosition(row, col);
        const dx = pos.x - endX;
        const dy = pos.y - endY;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestDist2) {
          bestDist2 = d2;
          bestRow = row;
          bestCol = col;
          bestX = pos.x;
          bestY = pos.y;
        }
      }
    }

    if (bestRow === -1 || bestDist2 > maxDist2) return null;
    return { row: bestRow, col: bestCol, worldX: bestX, worldY: bestY };
  }

  private _snapshotOccupiedCells(grid: IBubbleGrid, layout: BubbleGridLayout): ICellPos[] {
    const cells: ICellPos[] = [];
    for (let row = 0; row < grid.rowCount; row++) {
      const colCount = grid.getColumnCount(row);
      for (let col = 0; col < colCount; col++) {
        if (grid.isOccupied(row, col)) cells.push(layout.getCellWorldPosition(row, col));
      }
    }
    return cells;
  }

  private _nearestWallHit(
    posX: number,
    posY: number,
    dirX: number,
    dirY: number,
    leftWall: number,
    rightWall: number,
    topWall: number,
  ): { t: number; kind: "left" | "right" | "top" } | null {
    let bestT = Infinity;
    let bestKind: "left" | "right" | "top" | null = null;
    if (dirX < 0) {
      const t = (leftWall - posX) / dirX;
      if (t > 0 && t < bestT) {
        bestT = t;
        bestKind = "left";
      }
    } else if (dirX > 0) {
      const t = (rightWall - posX) / dirX;
      if (t > 0 && t < bestT) {
        bestT = t;
        bestKind = "right";
      }
    }
    if (dirY > 0) {
      const t = (topWall - posY) / dirY;
      if (t > 0 && t < bestT) {
        bestT = t;
        bestKind = "top";
      }
    }
    return bestKind === null ? null : { t: bestT, kind: bestKind };
  }

  private _nearestBubbleHit(
    posX: number,
    posY: number,
    dirX: number,
    dirY: number,
    cells: readonly ICellPos[],
    collisionR2: number,
  ): { t: number } | null {
    let bestT = Infinity;
    for (const c of cells) {
      const dx = c.x - posX;
      const dy = c.y - posY;
      const tCenter = dx * dirX + dy * dirY;
      if (tCenter <= 0) continue;
      const closestX = posX + dirX * tCenter;
      const closestY = posY + dirY * tCenter;
      const cdx = closestX - c.x;
      const cdy = closestY - c.y;
      const closestD2 = cdx * cdx + cdy * cdy;
      if (closestD2 > collisionR2) continue;
      const back = Math.sqrt(collisionR2 - closestD2);
      const tEnter = tCenter - back;
      if (tEnter > 0 && tEnter < bestT) bestT = tEnter;
    }
    return bestT === Infinity ? null : { t: bestT };
  }
}
