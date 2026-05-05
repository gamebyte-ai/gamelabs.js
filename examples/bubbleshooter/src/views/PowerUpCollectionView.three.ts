import * as THREE from "three";
import { WorldViewBase, type IInstanceResolver } from "@gamebyte/gamelabsjs";
import type { IPowerUpCollectionView } from "./IPowerUpCollectionView";
import { PowerUpButtonTargets } from "./PowerUpButtonTargets";
import { BubbleShooterConfig } from "../BubbleShooterConfig";
import { BubbleShooterAssetIds } from "../BubbleShooterAssetIds";
import type { PowerUpKind } from "../events/GameEvents";

const ICON_VISUAL_RADIUS_FACTOR = 0.94;
const ICON_DISC_SEGMENTS = 32;
const ICON_Z = 0.7;

interface IFlight {
  readonly kind: PowerUpKind;
  readonly mesh: THREE.Mesh;
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
  age: number;
  readonly lifetime: number;
}

/**
 * Renders in-flight power-up collection icons. Each `spawn(kind, fromX,
 * fromY)` adds a textured plane at the origin and starts a cubic-ease-in
 * flight toward the matching HUD button's world position. The icon is
 * intentionally NOT clipped by the play-area planes so it can fly past
 * the border into HUD-button territory.
 */
export class PowerUpCollectionView extends WorldViewBase implements IPowerUpCollectionView {
  private _config: BubbleShooterConfig | null = null;
  private _targets: PowerUpButtonTargets | null = null;

  private _geometry: THREE.CircleGeometry | null = null;
  private _bombMaterial: THREE.MeshBasicMaterial | null = null;
  private _fireballMaterial: THREE.MeshBasicMaterial | null = null;
  private readonly _flights: IFlight[] = [];

  public override inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._config = resolver.getInstance(BubbleShooterConfig);
    this._targets = resolver.getInstance(PowerUpButtonTargets);
  }

  public override postInitialize(): void {
    super.postInitialize();
    const config = this._config;
    if (!config) return;
    this._geometry = new THREE.CircleGeometry(config.bubbleRadius * ICON_VISUAL_RADIUS_FACTOR, ICON_DISC_SEGMENTS);
    this._bombMaterial = this._buildMaterial(BubbleShooterAssetIds.BombBubble);
    this._fireballMaterial = this._buildMaterial(BubbleShooterAssetIds.FireballBubble);
  }

  private _buildMaterial(assetId: string): THREE.MeshBasicMaterial {
    const tex = this.assetLoader.getAsset<THREE.Texture>(assetId);
    return new THREE.MeshBasicMaterial({
      map: tex ?? null,
      transparent: true,
      depthWrite: false,
    });
  }

  public spawn(kind: PowerUpKind, fromX: number, fromY: number): void {
    const config = this._config;
    const targets = this._targets;
    const geometry = this._geometry;
    if (!config || !targets || !geometry) return;
    const material = kind === "bomb" ? this._bombMaterial : this._fireballMaterial;
    if (!material) return;
    const toX = kind === "bomb" ? targets.bombX : targets.fireballX;
    const toY = kind === "bomb" ? targets.bombY : targets.fireballY;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(fromX, fromY, ICON_Z);
    mesh.renderOrder = 14;
    this.add(mesh);
    this._flights.push({
      kind,
      mesh,
      fromX,
      fromY,
      toX,
      toY,
      age: 0,
      lifetime: config.powerUpCollectDurationSeconds,
    });
  }

  public tick(dt: number): void {
    if (this._flights.length === 0) return;
    for (let i = this._flights.length - 1; i >= 0; i--) {
      const f = this._flights[i]!;
      f.age += dt;
      if (f.age >= f.lifetime) {
        this.remove(f.mesh);
        this._flights.splice(i, 1);
        continue;
      }
      // Cubic ease-in: starts slow, accelerates as it approaches the
      // button (matches the spec's "slow start, faster as it
      // approaches"). t³ feels punchier than t² for a short flight.
      const t = f.age / f.lifetime;
      const e = t * t * t;
      f.mesh.position.x = f.fromX + (f.toX - f.fromX) * e;
      f.mesh.position.y = f.fromY + (f.toY - f.fromY) * e;
    }
  }

  public clearAll(): void {
    for (const f of this._flights) this.remove(f.mesh);
    this._flights.length = 0;
  }

  public override preDestroy(): void {
    this.clearAll();
    this._bombMaterial?.dispose();
    this._bombMaterial = null;
    this._fireballMaterial?.dispose();
    this._fireballMaterial = null;
    this._geometry?.dispose();
    this._geometry = null;
    this._config = null;
    this._targets = null;
    super.preDestroy();
  }
}
