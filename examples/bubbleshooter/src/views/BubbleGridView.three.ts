import * as THREE from "three";
import { WorldViewBase, type IInstanceResolver } from "@gamebyte/gamelabsjs";
import type { IBubbleGridView } from "./IBubbleGridView";
import { BubbleShooterConfig } from "../BubbleShooterConfig";
import { BubbleGridLayout } from "../utilities/BubbleGridLayout";
import { ALL_BUBBLE_COLORS, BUBBLE_COLOR_HEX, type BubbleColor } from "../constants/BubbleColor";
import { BUBBLE_COLOR_TO_ASSET_ID } from "../BubbleShooterAssetIds";

const BUBBLE_DISC_SEGMENTS = 48;
const BUBBLE_VISUAL_RADIUS_FACTOR = 0.94;

interface IBubbleShake {
  readonly mesh: THREE.Mesh;
  readonly baseX: number;
  readonly baseY: number;
  readonly dirX: number;
  readonly dirY: number;
  readonly peak: number;
  readonly omega: number;
  readonly decay: number;
  age: number;
  readonly lifetime: number;
}

/**
 * The cluster bubble grid. Owns one mesh per occupied cell in the
 * grid, keyed by `row|col`. Also runs the jelly-wobble snap shake —
 * after a fired bubble settles, a damped sine impulse propagates
 * outward through occupied-neighbour adjacency for a few hex rings,
 * each ring scaled down by the falloff.
 */
export class BubbleGridView extends WorldViewBase implements IBubbleGridView {
  private _config: BubbleShooterConfig | null = null;
  private _layout: BubbleGridLayout | null = null;

  private _bubbleGeometry: THREE.CircleGeometry | null = null;
  private readonly _bubbleMaterials = new Map<BubbleColor, THREE.MeshBasicMaterial>();
  private readonly _bubbleMeshes = new Map<string, THREE.Mesh>();
  private readonly _bubbleShakes = new Map<string, IBubbleShake>();

  public override inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._config = resolver.getInstance(BubbleShooterConfig);
    this._layout = resolver.getInstance(BubbleGridLayout);
  }

  public override postInitialize(): void {
    super.postInitialize();
    const config = this._config;
    if (!config) return;
    this._bubbleGeometry = new THREE.CircleGeometry(
      config.bubbleRadius * BUBBLE_VISUAL_RADIUS_FACTOR,
      BUBBLE_DISC_SEGMENTS,
    );
    for (const color of ALL_BUBBLE_COLORS) {
      const tex = this.assetLoader.getAsset<THREE.Texture>(BUBBLE_COLOR_TO_ASSET_ID[color]);
      this._bubbleMaterials.set(
        color,
        tex
          ? new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
          : new THREE.MeshBasicMaterial({ color: BUBBLE_COLOR_HEX[color], transparent: true, depthWrite: false }),
      );
    }
  }

  public setBubble(row: number, col: number, color: BubbleColor): void {
    const layout = this._layout;
    const geometry = this._bubbleGeometry;
    if (!layout || !geometry) return;
    const material = this._bubbleMaterials.get(color);
    if (!material) return;
    const pos = layout.getCellWorldPosition(row, col);
    const key = this._key(row, col);
    let mesh = this._bubbleMeshes.get(key);
    if (mesh) {
      mesh.material = material;
      mesh.position.set(pos.x, pos.y, 0);
      return;
    }
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(pos.x, pos.y, 0);
    this._bubbleMeshes.set(key, mesh);
    this.add(mesh);
  }

  public removeBubble(row: number, col: number): void {
    const key = this._key(row, col);
    const mesh = this._bubbleMeshes.get(key);
    if (!mesh) return;
    this.remove(mesh);
    this._bubbleMeshes.delete(key);
    this._bubbleShakes.delete(key);
  }

  /**
   * Kick off a jelly-wobble ripple. BFS across hex neighbours up to
   * `snapShakeRingCount` rings; only propagates through occupied
   * cells (an empty neighbour breaks the chain). Each ring's peak is
   * scaled by `snapShakeRingFalloff^(depth-1)`. Each shaken mesh
   * runs a damped sine outward from the snap centre and settles back.
   */
  public playSnapShake(snapRow: number, snapCol: number): void {
    const layout = this._layout;
    const config = this._config;
    if (!layout || !config) return;
    const basePeak = config.snapShakePeakOffset;
    const lifetime = config.snapShakeDurationSeconds;
    const ringCount = config.snapShakeRingCount;
    const falloff = config.snapShakeRingFalloff;
    if (basePeak <= 0 || lifetime <= 0 || ringCount <= 0) return;
    const omega = 2 * Math.PI * config.snapShakeFrequencyHz;
    const decay = config.snapShakeDecayRate;
    const snapPos = layout.getCellWorldPosition(snapRow, snapCol);

    const visited = new Set<string>();
    visited.add(this._key(snapRow, snapCol));
    let frontier: { row: number; col: number }[] = [{ row: snapRow, col: snapCol }];

    for (let depth = 1; depth <= ringCount; depth++) {
      const ringPeak = basePeak * Math.pow(falloff, depth - 1);
      const next: { row: number; col: number }[] = [];
      for (const cur of frontier) {
        for (const off of layout.getNeighborOffsets(cur.row)) {
          const nr = cur.row + off.dRow;
          const nc = cur.col + off.dCol;
          const key = this._key(nr, nc);
          if (visited.has(key)) continue;
          visited.add(key);
          if (!layout.isInBounds(nr, nc)) continue;
          // Empty cells break the propagation chain.
          const mesh = this._bubbleMeshes.get(key);
          if (!mesh) continue;
          next.push({ row: nr, col: nc });
          const cellPos = layout.getCellWorldPosition(nr, nc);
          let dx = cellPos.x - snapPos.x;
          let dy = cellPos.y - snapPos.y;
          const len = Math.hypot(dx, dy);
          if (len < 0.0001) {
            dx = 0;
            dy = 1;
          } else {
            dx /= len;
            dy /= len;
          }
          this._bubbleShakes.set(key, {
            mesh,
            baseX: cellPos.x,
            baseY: cellPos.y,
            dirX: dx,
            dirY: dy,
            peak: ringPeak,
            omega,
            decay,
            age: 0,
            lifetime,
          });
        }
      }
      frontier = next;
    }
  }

  public updateBubbleShakes(dt: number): void {
    if (this._bubbleShakes.size === 0) return;
    for (const [key, shake] of this._bubbleShakes) {
      shake.age += dt;
      if (shake.age >= shake.lifetime) {
        shake.mesh.position.x = shake.baseX;
        shake.mesh.position.y = shake.baseY;
        this._bubbleShakes.delete(key);
        continue;
      }
      const t = shake.age;
      const offset = shake.peak * Math.exp(-shake.decay * t) * Math.sin(shake.omega * t);
      shake.mesh.position.x = shake.baseX + shake.dirX * offset;
      shake.mesh.position.y = shake.baseY + shake.dirY * offset;
    }
  }

  private _key(row: number, col: number): string {
    return `${row}|${col}`;
  }

  public override preDestroy(): void {
    for (const mesh of this._bubbleMeshes.values()) this.remove(mesh);
    this._bubbleMeshes.clear();
    this._bubbleShakes.clear();
    for (const mat of this._bubbleMaterials.values()) mat.dispose();
    this._bubbleMaterials.clear();
    this._bubbleGeometry?.dispose();
    this._bubbleGeometry = null;
    this._config = null;
    this._layout = null;
    super.preDestroy();
  }
}
