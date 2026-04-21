import * as THREE from "three";
import { TowerTypeId, TOWER_TYPES, type TowerTypeDef } from "../constants/TowerTypeDef.js";
import type { TowerDefenseConfig } from "../TowerDefenseConfig.js";
import type { GameEvents } from "../events/GameEvents.js";
import type { SfxService } from "../services/SfxService.js";
import type { EnemyManager, EnemyInstance } from "./EnemyManager.js";

interface TowerState {
  col: number;
  row: number;
  towerTypeId: TowerTypeId;
  cooldown: number;
  /** Laser: ID of the currently locked-on target (0 = none). */
  lockedTargetId: number;
  /** Laser: consecutive hits on the same target. */
  consecutiveHits: number;
  /** Laser: persistent beam line (stays visible while locked). */
  beamLine: THREE.Line | null;
}

interface ProjectileBase {
  mesh: THREE.Mesh;
  damage: number;
  isArea: boolean;
  areaRadius: number;
  knockbackForce: number;
  towerCol: number;
  towerRow: number;
  trailAccum: number;
  freezeDuration: number;
}

interface LinearProjectile extends ProjectileBase {
  arc: false;
  targetId: number;
  speed: number;
}

interface ArcProjectile extends ProjectileBase {
  arc: true;
  startX: number;
  startY: number;
  startZ: number;
  impactX: number;
  impactZ: number;
  duration: number;
  elapsed: number;
  peakHeight: number;
}

type ProjectileState = LinearProjectile | ArcProjectile;

interface TrailParticle { sprite: THREE.Sprite; life: number; maxLife: number; }
interface ShockwaveRing { mesh: THREE.Mesh; life: number; maxLife: number; targetScale: number; }
interface ArcVisual { line: THREE.Line; life: number; maxLife: number; }

export class CombatManager {
  private static readonly PROJECTILE_RADIUS = 0.06;
  private static readonly ARC_PROJECTILE_RADIUS = 0.10;
  private static readonly LINEAR_HIT_DISTANCE = 0.18;
  private static readonly TOWER_LAUNCH_Y = 0.5;
  private static readonly TRAIL_INTERVAL = 0.03;
  private static readonly TRAIL_LIFE_LINEAR = 0.15;
  private static readonly TRAIL_LIFE_ARC = 0.25;
  private static readonly TRAIL_SIZE_LINEAR = 0.04;
  private static readonly TRAIL_SIZE_ARC = 0.07;
  private static readonly SHOCKWAVE_LIFE = 0.4;
  private static readonly ARC_VISUAL_LIFE = 0.12;
  private static readonly ARC_SEGMENTS = 8;

  private static _trailTexture: THREE.CanvasTexture | null = null;

  private readonly _config: TowerDefenseConfig;
  private readonly _events: GameEvents;
  private readonly _sfx: SfxService;
  private readonly _enemyManager: EnemyManager;
  private readonly _container: THREE.Group;
  private readonly _towers: TowerState[] = [];
  private readonly _projectiles: ProjectileState[] = [];
  private readonly _trails: TrailParticle[] = [];
  private readonly _shockwaves: ShockwaveRing[] = [];
  private readonly _arcs: ArcVisual[] = [];

  public constructor(config: TowerDefenseConfig, events: GameEvents, sfx: SfxService, enemyManager: EnemyManager, container: THREE.Group) {
    this._config = config;
    this._events = events;
    this._sfx = sfx;
    this._enemyManager = enemyManager;
    this._container = container;
  }

  public addTower(col: number, row: number, towerTypeId: TowerTypeId): void {
    const typeDef = TOWER_TYPES.get(towerTypeId);
    if (!typeDef) return;
    this._towers.push({ col, row, towerTypeId, cooldown: typeDef.attackInterval, lockedTargetId: 0, consecutiveHits: 0, beamLine: null });
  }

  public clearTowers(): void {
    for (const t of this._towers) this._removeLaserBeam(t);
    this._towers.length = 0;
    for (let i = this._projectiles.length - 1; i >= 0; i--) this._destroyProjectile(i);
    this._clearTrails();
    this._clearShockwaves();
    this._clearArcs();
  }

  public update(dt: number): void {
    this._tickTowers(dt);
    this._tickProjectiles(dt);
    this._tickTrails(dt);
    this._tickShockwaves(dt);
    this._tickArcs(dt);
  }

  // ── Tower attack ──────────────────────────────────────────────────────

  private _tickTowers(dt: number): void {
    const enemies = this._enemyManager.activeEnemies;
    for (const tower of this._towers) {
      const typeDef = TOWER_TYPES.get(tower.towerTypeId);
      if (!typeDef) continue;

      // Laser beam towers: update the persistent beam every frame,
      // but only apply damage on cooldown ticks.
      if (typeDef.isBeamTower) {
        this._tickLaserBeam(tower, typeDef, enemies, dt);
        continue;
      }

      // All other towers only act when cooldown expires.
      tower.cooldown -= dt;
      if (tower.cooldown > 0 || enemies.length === 0) continue;

      if (typeDef.isInstantHit) {
        if (this._fireTesla(tower, typeDef, enemies)) tower.cooldown = typeDef.attackInterval;
        continue;
      }

      const target = this._findTarget(tower.col, tower.row, typeDef.range, enemies);
      if (!target) continue;
      tower.cooldown = typeDef.attackInterval;
      this._fireProjectile(tower, target, typeDef);
    }
  }

  private _findTarget(col: number, row: number, range: number, enemies: ReadonlyArray<EnemyInstance>): EnemyInstance | null {
    const r2 = range * range;
    let closest: EnemyInstance | null = null;
    let bestDist = r2;
    let lowHpTarget: EnemyInstance | null = null;
    let lowestHp = Infinity;
    for (const e of enemies) {
      const dx = e.posX - col;
      const dz = e.posZ - row;
      const d2 = dx * dx + dz * dz;
      if (d2 > r2) continue;
      if (d2 < bestDist) { bestDist = d2; closest = e; }
      const hpRatio = e.hp / e.typeDef.hp;
      if (hpRatio < 0.25 && e.hp < lowestHp) { lowestHp = e.hp; lowHpTarget = e; }
    }
    return lowHpTarget ?? closest;
  }

  /** Find up to N enemies in range, sorted by distance. */
  private _findTargets(col: number, row: number, range: number, max: number, enemies: ReadonlyArray<EnemyInstance>): EnemyInstance[] {
    const r2 = range * range;
    const hits: { e: EnemyInstance; d2: number }[] = [];
    for (const e of enemies) {
      const dx = e.posX - col;
      const dz = e.posZ - row;
      const d2 = dx * dx + dz * dz;
      if (d2 <= r2) hits.push({ e, d2 });
    }
    hits.sort((a, b) => a.d2 - b.d2);
    return hits.slice(0, max).map((h) => h.e);
  }

  // ── Projectile fire ───────────────────────────────────────────────────

  private _fireProjectile(tower: TowerState, target: EnemyInstance, typeDef: TowerTypeDef): void {
    const base: Omit<ProjectileBase, "mesh" | "trailAccum"> = {
      damage: typeDef.damage, isArea: typeDef.isAreaDamage, areaRadius: typeDef.areaRadius,
      knockbackForce: typeDef.knockbackForce, towerCol: tower.col, towerRow: tower.row,
      freezeDuration: typeDef.freezeDuration,
    };
    if (typeDef.projectileArc) {
      this._fireArc(tower, target, typeDef, base);
      this._sfx.playCannonLaunch();
      this._events.emitCannonFired(tower.col, tower.row, target.posX, target.posZ);
    } else {
      this._sfx.playArcherFire();
      this._fireLinear(tower, target, typeDef, base);
    }
  }

  private _fireLinear(tower: TowerState, target: EnemyInstance, typeDef: TowerTypeDef, base: Omit<ProjectileBase, "mesh" | "trailAccum">): void {
    const mesh = this._makeMesh(CombatManager.PROJECTILE_RADIUS, typeDef.color);
    mesh.position.set(tower.col, CombatManager.TOWER_LAUNCH_Y, tower.row);
    this._container.add(mesh);
    this._projectiles.push({ ...base, mesh, trailAccum: 0, arc: false, targetId: target.id, speed: typeDef.projectileSpeed });
  }

  private _fireArc(tower: TowerState, target: EnemyInstance, typeDef: TowerTypeDef, base: Omit<ProjectileBase, "mesh" | "trailAccum">): void {
    const mesh = this._makeMesh(CombatManager.ARC_PROJECTILE_RADIUS, typeDef.color);
    const sX = tower.col, sY = CombatManager.TOWER_LAUNCH_Y, sZ = tower.row;
    mesh.position.set(sX, sY, sZ);
    this._container.add(mesh);
    const dx = target.posX - sX, dz = target.posZ - sZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    this._projectiles.push({ ...base, mesh, trailAccum: 0, arc: true, startX: sX, startY: sY, startZ: sZ, impactX: target.posX, impactZ: target.posZ, duration: Math.max(0.3, dist / typeDef.projectileSpeed), elapsed: 0, peakHeight: dist * this._config.cannonArcHeightFactor });
  }

  // ── Tesla instant-hit ─────────────────────────────────────────────────

  private _fireTesla(tower: TowerState, typeDef: TowerTypeDef, enemies: ReadonlyArray<EnemyInstance>): boolean {
    const targets = this._findTargets(tower.col, tower.row, typeDef.range, typeDef.maxTargets, enemies);
    if (targets.length === 0) return false;

    this._sfx.playTeslaZap();

    for (const t of targets) {
      this._enemyManager.damageEnemy(t.id, typeDef.damage);
      const kbx = t.posX - tower.col;
      const kbz = t.posZ - tower.row;
      const kbLen = Math.sqrt(kbx * kbx + kbz * kbz);
      if (kbLen > 0.01) this._enemyManager.applyKnockback(t.id, (kbx / kbLen) * typeDef.knockbackForce, (kbz / kbLen) * typeDef.knockbackForce);
      this._spawnArc(tower.col, CombatManager.TOWER_LAUNCH_Y, tower.row, t.posX, 0.32 * t.typeDef.scale, t.posZ);
    }
    return true;
  }

  // ── Laser beam (persistent) ────────────────────────────────────────────

  /**
   * Called every frame for beam towers. Maintains lock-on, updates the
   * persistent beam visual, and applies damage on cooldown ticks.
   */
  private _tickLaserBeam(tower: TowerState, typeDef: TowerTypeDef, enemies: ReadonlyArray<EnemyInstance>, dt: number): void {
    const r2 = typeDef.range * typeDef.range;

    // Resolve the locked target (still alive + in range?)
    let locked: EnemyInstance | undefined;
    if (tower.lockedTargetId > 0) {
      locked = enemies.find((e) => e.id === tower.lockedTargetId);
      if (locked) {
        const dx = locked.posX - tower.col;
        const dz = locked.posZ - tower.row;
        if (dx * dx + dz * dz > r2) locked = undefined;
      }
    }

    // Lost lock → try to find a new target
    if (!locked) {
      this._removeLaserBeam(tower);
      tower.consecutiveHits = 0;
      if (enemies.length === 0) { tower.lockedTargetId = 0; return; }
      const newTarget = this._findTarget(tower.col, tower.row, typeDef.range, enemies);
      if (!newTarget) { tower.lockedTargetId = 0; return; }
      tower.lockedTargetId = newTarget.id;
      locked = newTarget;
    }

    // ── Visual: persistent beam (create or update) ──────────────────
    const tY = CombatManager.TOWER_LAUNCH_Y;
    const eY = 0.32 * locked.typeDef.scale;
    if (!tower.beamLine) {
      const geom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(tower.col, tY, tower.row), new THREE.Vector3(locked.posX, eY, locked.posZ)]);
      const mat = new THREE.LineBasicMaterial({ color: 0xcc66ff, transparent: true, opacity: 0.85, linewidth: 2 });
      tower.beamLine = new THREE.Line(geom, mat);
      tower.beamLine.renderOrder = 95;
      this._container.add(tower.beamLine);
    } else {
      // Update endpoints to track the moving enemy
      const pos = tower.beamLine.geometry.attributes["position"] as THREE.BufferAttribute;
      pos.setXYZ(0, tower.col, tY, tower.row);
      pos.setXYZ(1, locked.posX, eY, locked.posZ);
      pos.needsUpdate = true;
    }

    // Rotate tower toward target every frame
    this._events.emitCannonFired(tower.col, tower.row, locked.posX, locked.posZ);

    // ── Damage: only on cooldown ticks ──────────────────────────────
    tower.cooldown -= dt;
    if (tower.cooldown > 0) return;
    tower.cooldown = typeDef.attackInterval;

    const dmg = typeDef.damage * Math.pow(typeDef.damageRampFactor, tower.consecutiveHits);
    this._enemyManager.damageEnemy(locked.id, dmg);
    tower.consecutiveHits++;

    const kbx = locked.posX - tower.col;
    const kbz = locked.posZ - tower.row;
    const kbLen = Math.sqrt(kbx * kbx + kbz * kbz);
    if (kbLen > 0.01) this._enemyManager.applyKnockback(locked.id, (kbx / kbLen) * typeDef.knockbackForce, (kbz / kbLen) * typeDef.knockbackForce);

    this._sfx.playLaserHit();
  }

  private _removeLaserBeam(tower: TowerState): void {
    if (!tower.beamLine) return;
    tower.beamLine.geometry.dispose();
    (tower.beamLine.material as THREE.Material).dispose();
    tower.beamLine.removeFromParent();
    tower.beamLine = null;
  }

  // ── Projectile tick ───────────────────────────────────────────────────

  private _tickProjectiles(dt: number): void {
    for (let i = this._projectiles.length - 1; i >= 0; i--) {
      const p = this._projectiles[i];
      p.trailAccum += dt;
      if (p.trailAccum >= CombatManager.TRAIL_INTERVAL) {
        p.trailAccum -= CombatManager.TRAIL_INTERVAL;
        this._spawnTrail(p.mesh.position.x, p.mesh.position.y, p.mesh.position.z, p.arc);
      }
      if (p.arc) { this._tickArc(p, i, dt); } else { this._tickLinear(p, i, dt); }
    }
  }

  private _tickLinear(p: LinearProjectile, index: number, dt: number): void {
    const enemies = this._enemyManager.activeEnemies;
    const target = enemies.find((e) => e.id === p.targetId);
    if (!target) { this._destroyProjectile(index); return; }
    const dx = target.posX - p.mesh.position.x;
    const dy = (0.32 * target.typeDef.scale - p.mesh.position.y);
    const dz = target.posZ - p.mesh.position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < CombatManager.LINEAR_HIT_DISTANCE) {
      this._sfx.playArcherHit();
      this._enemyManager.damageEnemy(p.targetId, p.damage);
      const kbx = target.posX - p.towerCol, kbz = target.posZ - p.towerRow;
      const kbLen = Math.sqrt(kbx * kbx + kbz * kbz);
      if (kbLen > 0.01) this._enemyManager.applyKnockback(p.targetId, (kbx / kbLen) * p.knockbackForce, (kbz / kbLen) * p.knockbackForce);
      this._destroyProjectile(index);
      return;
    }
    const step = p.speed * dt / dist;
    p.mesh.position.x += dx * step;
    p.mesh.position.y += dy * step;
    p.mesh.position.z += dz * step;
  }

  private _tickArc(p: ArcProjectile, index: number, dt: number): void {
    p.elapsed += dt;
    const t = Math.min(1, p.elapsed / p.duration);
    const x = p.startX + (p.impactX - p.startX) * t;
    const z = p.startZ + (p.impactZ - p.startZ) * t;
    const baseY = p.startY + (0 - p.startY) * t;
    p.mesh.position.set(x, baseY + 4 * p.peakHeight * t * (1 - t), z);
    if (t >= 1) {
      if (p.isArea) {
        this._enemyManager.damageEnemiesInArea(p.impactX, p.impactZ, p.areaRadius, p.damage);
        this._enemyManager.applyRadialKnockback(p.impactX, p.impactZ, p.areaRadius, p.knockbackForce);
        this._spawnShockwave(p.impactX, p.impactZ, p.areaRadius);
        if (p.freezeDuration > 0) {
          this._sfx.playIceFreeze();
          this._enemyManager.freezeEnemiesInArea(p.impactX, p.impactZ, p.areaRadius, p.freezeDuration);
        } else {
          this._sfx.playCannonLand();
        }
      }
      this._destroyProjectile(index);
    }
  }

  private _makeMesh(radius: number, color: number): THREE.Mesh {
    return new THREE.Mesh(new THREE.SphereGeometry(radius, 6, 4), new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.4 }));
  }

  private _destroyProjectile(index: number): void {
    const proj = this._projectiles[index];
    proj.mesh.geometry.dispose();
    (proj.mesh.material as THREE.Material).dispose();
    proj.mesh.removeFromParent();
    this._projectiles.splice(index, 1);
  }

  // ── Trail particles ───────────────────────────────────────────────────

  private _spawnTrail(x: number, y: number, z: number, isArc: boolean): void {
    const tex = CombatManager._getTrailTexture();
    const color = isArc ? 0xff6622 : 0x88ff88;
    const mat = new THREE.SpriteMaterial({ map: tex, color, transparent: true, opacity: 0.7, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    const sz = isArc ? CombatManager.TRAIL_SIZE_ARC : CombatManager.TRAIL_SIZE_LINEAR;
    sprite.scale.set(sz, sz, 1);
    sprite.position.set(x, y, z);
    this._container.add(sprite);
    this._trails.push({ sprite, life: isArc ? CombatManager.TRAIL_LIFE_ARC : CombatManager.TRAIL_LIFE_LINEAR, maxLife: isArc ? CombatManager.TRAIL_LIFE_ARC : CombatManager.TRAIL_LIFE_LINEAR });
  }

  private _tickTrails(dt: number): void {
    for (let i = this._trails.length - 1; i >= 0; i--) {
      const t = this._trails[i];
      t.life -= dt;
      (t.sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, (t.life / t.maxLife) * 0.7);
      if (t.life <= 0) { (t.sprite.material as THREE.SpriteMaterial).dispose(); t.sprite.removeFromParent(); this._trails.splice(i, 1); }
    }
  }

  private _clearTrails(): void {
    for (const t of this._trails) { (t.sprite.material as THREE.SpriteMaterial).dispose(); t.sprite.removeFromParent(); }
    this._trails.length = 0;
  }

  private static _getTrailTexture(): THREE.CanvasTexture {
    if (CombatManager._trailTexture) return CombatManager._trailTexture;
    const sz = 32, c = document.createElement("canvas");
    c.width = sz; c.height = sz;
    const ctx = c.getContext("2d")!;
    const grad = ctx.createRadialGradient(sz / 2, sz / 2, 0, sz / 2, sz / 2, sz / 2);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.4, "rgba(255,255,255,0.5)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, sz, sz);
    CombatManager._trailTexture = new THREE.CanvasTexture(c);
    return CombatManager._trailTexture;
  }

  // ── Shockwave ring ────────────────────────────────────────────────────

  private _spawnShockwave(x: number, z: number, radius: number): void {
    const geom = new THREE.RingGeometry(radius - 0.06, radius + 0.06, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff4422, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
    const ring = new THREE.Mesh(geom, mat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.15, z);
    ring.scale.set(0.01, 0.01, 0.01);
    ring.renderOrder = 90;
    this._container.add(ring);
    this._shockwaves.push({ mesh: ring, life: CombatManager.SHOCKWAVE_LIFE, maxLife: CombatManager.SHOCKWAVE_LIFE, targetScale: 1 });
  }

  private _tickShockwaves(dt: number): void {
    for (let i = this._shockwaves.length - 1; i >= 0; i--) {
      const sw = this._shockwaves[i];
      sw.life -= dt;
      const t = 1 - sw.life / sw.maxLife;
      const s = sw.targetScale * t;
      sw.mesh.scale.set(s, s, s);
      (sw.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - t);
      if (sw.life <= 0) { sw.mesh.geometry.dispose(); (sw.mesh.material as THREE.Material).dispose(); sw.mesh.removeFromParent(); this._shockwaves.splice(i, 1); }
    }
  }

  private _clearShockwaves(): void {
    for (const sw of this._shockwaves) { sw.mesh.geometry.dispose(); (sw.mesh.material as THREE.Material).dispose(); sw.mesh.removeFromParent(); }
    this._shockwaves.length = 0;
  }

  // ── Electric arcs (Tesla) ─────────────────────────────────────────────

  private _spawnArc(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): void {
    const n = CombatManager.ARC_SEGMENTS;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const bx = x1 + (x2 - x1) * t;
      const by = y1 + (y2 - y1) * t;
      const bz = z1 + (z2 - z1) * t;
      // Jagged lateral offset (none at endpoints)
      const jitter = (i > 0 && i < n) ? 0.08 : 0;
      points.push(new THREE.Vector3(bx + (Math.random() - 0.5) * jitter, by + (Math.random() - 0.5) * jitter, bz + (Math.random() - 0.5) * jitter));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.9, linewidth: 2 });
    const line = new THREE.Line(geom, mat);
    line.renderOrder = 95;
    this._container.add(line);
    this._arcs.push({ line, life: CombatManager.ARC_VISUAL_LIFE, maxLife: CombatManager.ARC_VISUAL_LIFE });
  }

  private _tickArcs(dt: number): void {
    for (let i = this._arcs.length - 1; i >= 0; i--) {
      const a = this._arcs[i];
      a.life -= dt;
      (a.line.material as THREE.LineBasicMaterial).opacity = Math.max(0, (a.life / a.maxLife) * 0.9);
      if (a.life <= 0) { a.line.geometry.dispose(); (a.line.material as THREE.Material).dispose(); a.line.removeFromParent(); this._arcs.splice(i, 1); }
    }
  }

  private _clearArcs(): void {
    for (const a of this._arcs) { a.line.geometry.dispose(); (a.line.material as THREE.Material).dispose(); a.line.removeFromParent(); }
    this._arcs.length = 0;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────

  public destroy(): void {
    this.clearTowers();
    this._container.removeFromParent();
  }
}
