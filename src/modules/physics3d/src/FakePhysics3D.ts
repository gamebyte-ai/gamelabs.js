import { FixedStepAccumulator } from "../../../core/utilities/FixedStepAccumulator.js";
import type { Unsubscribe } from "../../../core/events/subscriptions.js";
import { Physics3DEvents } from "./Physics3DEvents.js";
import type { Body3DDef, BodyId, Body3DType, ContactInfo3D, Physics3DConfig, RaycastHit3D, Transform3D, Vec3Like } from "./types.js";

interface FakeBody {
  id: BodyId;
  x: number;
  y: number;
  z: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
  vx: number;
  vy: number;
  vz: number;
  type: Body3DType;
  mass: number;
  tag: string | undefined;
}

/**
 * Engine-free, deterministic stand-in for {@link Physics3DManager} with the
 * same public surface. Runs a trivial gravity + velocity integrator (no
 * collision detection or rotation dynamics) on a fixed timestep so game logic
 * can be unit-tested without loading cannon-es. Collisions are driven
 * explicitly via {@link emitCollisionStart} / {@link emitCollisionEnd}.
 */
export class FakePhysics3D {
  private readonly _accumulator: FixedStepAccumulator;
  private readonly _events = new Physics3DEvents();
  private readonly _bodies = new Map<BodyId, FakeBody>();
  private readonly _gx: number;
  private readonly _gy: number;
  private readonly _gz: number;
  private _nextId = 1;

  /** Total fixed sub-steps simulated — handy for asserting step cadence in tests. */
  public stepsRun = 0;

  public constructor(config?: Physics3DConfig) {
    const g = config?.gravity ?? { x: 0, y: -9.82, z: 0 };
    this._gx = g.x;
    this._gy = g.y;
    this._gz = g.z;
    this._accumulator = new FixedStepAccumulator({
      hz: config?.fixedTimestepHz ?? 60,
      maxSubSteps: config?.maxSubSteps ?? 5,
    });
  }

  public step(dtSeconds: number): void {
    const steps = this._accumulator.consume(dtSeconds);
    const h = this._accumulator.fixedDt;
    for (let i = 0; i < steps; i++) {
      for (const b of this._bodies.values()) {
        // Only dynamic bodies integrate; kinematic bodies are positioned via
        // setKinematicTarget; static bodies never move.
        if (b.type !== "dynamic") continue;
        b.vx += this._gx * h;
        b.vy += this._gy * h;
        b.vz += this._gz * h;
        b.x += b.vx * h;
        b.y += b.vy * h;
        b.z += b.vz * h;
      }
      this.stepsRun++;
    }
  }

  public createBody(def: Body3DDef): BodyId {
    const id = this._nextId++;
    const rot = def.rotation ?? { x: 0, y: 0, z: 0, w: 1 };
    this._bodies.set(id, {
      id,
      x: def.x,
      y: def.y,
      z: def.z,
      qx: rot.x,
      qy: rot.y,
      qz: rot.z,
      qw: rot.w,
      vx: 0,
      vy: 0,
      vz: 0,
      type: def.type ?? "dynamic",
      mass: def.mass ?? 1,
      tag: def.tag,
    });
    return id;
  }

  public removeBody(id: BodyId): void {
    this._bodies.delete(id);
  }

  public applyForce(id: BodyId, fx: number, fy: number, fz: number): void {
    const b = this._bodies.get(id);
    if (!b || b.type !== "dynamic") return;
    const dt = this._accumulator.fixedDt;
    b.vx += (fx / b.mass) * dt;
    b.vy += (fy / b.mass) * dt;
    b.vz += (fz / b.mass) * dt;
  }

  public applyImpulse(id: BodyId, ix: number, iy: number, iz: number): void {
    const b = this._bodies.get(id);
    if (!b || b.type !== "dynamic") return;
    b.vx += ix / b.mass;
    b.vy += iy / b.mass;
    b.vz += iz / b.mass;
  }

  public setVelocity(id: BodyId, vx: number, vy: number, vz: number): void {
    const b = this._bodies.get(id);
    if (!b) return;
    b.vx = vx;
    b.vy = vy;
    b.vz = vz;
  }

  public setAngularVelocity(_id: BodyId, _wx: number, _wy: number, _wz: number): void {
    // The fake does not simulate rotation; orientation stays at its initial value.
  }

  public setKinematicTarget(id: BodyId, x: number, y: number, z: number): void {
    const b = this._bodies.get(id);
    if (!b || b.type !== "kinematic") return;
    b.x = x;
    b.y = y;
    b.z = z;
    b.vx = 0;
    b.vy = 0;
    b.vz = 0;
  }

  public getTransform(id: BodyId, out?: Transform3D): Transform3D {
    const b = this._bodies.get(id);
    if (!b) throw new Error(`FakePhysics3D.getTransform: unknown body ${id}`);
    const t = out ?? { x: 0, y: 0, z: 0, qx: 0, qy: 0, qz: 0, qw: 1 };
    t.x = b.x;
    t.y = b.y;
    t.z = b.z;
    t.qx = b.qx;
    t.qy = b.qy;
    t.qz = b.qz;
    t.qw = b.qw;
    return t;
  }

  public getVelocity(id: BodyId, out?: Vec3Like): Vec3Like {
    const b = this._bodies.get(id);
    if (!b) throw new Error(`FakePhysics3D.getVelocity: unknown body ${id}`);
    const t = out ?? { x: 0, y: 0, z: 0 };
    t.x = b.vx;
    t.y = b.vy;
    t.z = b.vz;
    return t;
  }

  /** Bodies whose center lies within `radius` (default 0.5) of the point. */
  public queryPoint(x: number, y: number, z: number): readonly BodyId[] {
    const ids: BodyId[] = [];
    for (const b of this._bodies.values()) {
      const dx = b.x - x;
      const dy = b.y - y;
      const dz = b.z - z;
      if (dx * dx + dy * dy + dz * dz <= 0.25) ids.push(b.id);
    }
    return ids;
  }

  public queryAABB(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number): readonly BodyId[] {
    const ids: BodyId[] = [];
    for (const b of this._bodies.values()) {
      if (b.x >= minX && b.x <= maxX && b.y >= minY && b.y <= maxY && b.z >= minZ && b.z <= maxZ) ids.push(b.id);
    }
    return ids;
  }

  public getTag(id: BodyId): string | undefined {
    return this._bodies.get(id)?.tag;
  }

  public has(id: BodyId): boolean {
    return this._bodies.has(id);
  }

  public get bodyCount(): number {
    return this._bodies.size;
  }

  public raycast(
    _x1: number,
    _y1: number,
    _z1: number,
    _x2: number,
    _y2: number,
    _z2: number,
    _filter?: { collisionGroup?: number; collisionMask?: number },
  ): RaycastHit3D | null {
    return null;
  }

  public onCollisionStart(cb: (a: BodyId, b: BodyId, contact: ContactInfo3D) => void): Unsubscribe {
    return this._events.onCollisionStart(cb);
  }

  public onCollisionEnd(cb: (a: BodyId, b: BodyId) => void): Unsubscribe {
    return this._events.onCollisionEnd(cb);
  }

  /** Test hook: fire a collision-start event with an optional contact. */
  public emitCollisionStart(a: BodyId, b: BodyId, contact?: Partial<ContactInfo3D>): void {
    this._events.emitCollisionStart(a, b, {
      x: contact?.x ?? 0,
      y: contact?.y ?? 0,
      z: contact?.z ?? 0,
      normalX: contact?.normalX ?? 0,
      normalY: contact?.normalY ?? 0,
      normalZ: contact?.normalZ ?? 0,
    });
  }

  /** Test hook: fire a collision-end event. */
  public emitCollisionEnd(a: BodyId, b: BodyId): void {
    this._events.emitCollisionEnd(a, b);
  }

  public destroy(): void {
    this._bodies.clear();
    this._events.clear();
  }
}
