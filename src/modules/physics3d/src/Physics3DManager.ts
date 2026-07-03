import type { RayOptions, Shape } from "cannon-es";
import { Body, Box, ContactMaterial, Material, Plane, Quaternion, RaycastResult, Sphere, Vec3, World } from "cannon-es";

import { FixedStepAccumulator } from "../../../core/utilities/FixedStepAccumulator.js";
import type { Unsubscribe } from "../../../core/events/subscriptions.js";
import { Physics3DEvents } from "./Physics3DEvents.js";
import type { Body3DDef, BodyId, ContactInfo3D, Physics3DConfig, RaycastHit3D, Transform3D, Vec3Like } from "./types.js";

interface BodyRecord {
  readonly id: BodyId;
  readonly body: Body;
  readonly tag: string | undefined;
  readonly kinematic: boolean;
  // Interpolation snapshots (position + quaternion).
  prevX: number;
  prevY: number;
  prevZ: number;
  prevQx: number;
  prevQy: number;
  prevQz: number;
  prevQw: number;
  currX: number;
  currY: number;
  currZ: number;
  currQx: number;
  currQy: number;
  currQz: number;
  currQw: number;
}

type PendingContact =
  | { kind: "start"; a: number; b: number; x: number; y: number; z: number; nx: number; ny: number; nz: number }
  | { kind: "end"; a: number; b: number };

interface ContactEvent {
  bodyA: Body | null;
  bodyB: Body | null;
}

/**
 * cannon-es–backed 3D physics world.
 *
 * Owns authoritative body state and steps it on a fixed timestep. Game code
 * creates bodies, applies forces, reads (interpolated) transforms, and
 * subscribes to collisions through this typed API — `cannon-es` types never
 * leak, so controllers stay engine-agnostic and the view layer never touches
 * physics. Lifecycle is wired by the app (resolve in `postInitialize()`,
 * register `step` with the `UpdateManager`).
 */
export class Physics3DManager {
  private readonly _world: World;
  private readonly _accumulator: FixedStepAccumulator;
  private readonly _interpolation: boolean;
  private readonly _events = new Physics3DEvents();

  private readonly _worldMaterial: Material;
  private _defaultFriction: number;
  private readonly _defaultRestitution: number;

  private readonly _records = new Map<BodyId, BodyRecord>();
  private readonly _cannonToId = new Map<number, BodyId>();
  private _nextId = 1;

  private readonly _pendingContacts: PendingContact[] = [];
  private readonly _removeQueue: BodyId[] = [];
  private _stepping = false;

  // Reused scratch objects to keep the force/raycast hot paths allocation-free.
  private readonly _scratchVec = new Vec3();
  private readonly _rayFrom = new Vec3();
  private readonly _rayTo = new Vec3();
  private readonly _rayResult = new RaycastResult();

  public constructor(config?: Physics3DConfig) {
    const g = config?.gravity ?? { x: 0, y: -9.82, z: 0 };
    this._world = new World({
      gravity: new Vec3(g.x, g.y, g.z),
      allowSleep: config?.allowSleep ?? true,
    });

    this._worldMaterial = new Material("world");
    this._defaultFriction = config?.defaultFriction ?? 0.3;
    this._defaultRestitution = config?.defaultRestitution ?? 0;
    this._world.defaultContactMaterial.friction = this._defaultFriction;
    this._world.defaultContactMaterial.restitution = this._defaultRestitution;

    this._accumulator = new FixedStepAccumulator({
      hz: config?.fixedTimestepHz ?? 60,
      maxSubSteps: config?.maxSubSteps ?? 5,
    });
    this._interpolation = config?.interpolation ?? true;

    this._world.addEventListener("beginContact", (e: ContactEvent) => this._onContact(e, "start"));
    this._world.addEventListener("endContact", (e: ContactEvent) => this._onContact(e, "end"));
  }

  //  STEP

  public step(dtSeconds: number): void {
    const steps = this._accumulator.consume(dtSeconds);
    if (steps === 0) return;

    this._stepping = true;
    const h = this._accumulator.fixedDt;
    for (let i = 0; i < steps; i++) {
      for (const r of this._records.values()) this._snapshotPrev(r);
      this._world.step(h);
      for (const r of this._records.values()) this._snapshotCurr(r);
    }
    this._stepping = false;

    this._drainContacts();
    this._flushRemovals();
  }

  //  BODY LIFECYCLE

  public createBody(def: Body3DDef): BodyId {
    const id = this._nextId++;
    const kinematic = def.type === "kinematic";
    const isStatic = def.type === "static";
    const type = kinematic ? Body.KINEMATIC : isStatic ? Body.STATIC : Body.DYNAMIC;
    const mass = type === Body.DYNAMIC ? (def.mass ?? 1) : 0;
    const rot = def.rotation ?? { x: 0, y: 0, z: 0, w: 1 };

    const hasCustomMaterial = def.friction !== undefined || def.restitution !== undefined;
    const material = hasCustomMaterial ? this._makeBodyMaterial(def.friction, def.restitution) : this._worldMaterial;

    const body = new Body({
      mass,
      type,
      material,
      position: new Vec3(def.x, def.y, def.z),
      quaternion: new Quaternion(rot.x, rot.y, rot.z, rot.w),
      isTrigger: def.isSensor ?? false,
      collisionFilterGroup: def.collisionGroup ?? 1,
      collisionFilterMask: def.collisionMask ?? -1,
    });
    body.addShape(this._createShape(def.shape));
    this._world.addBody(body);

    const record: BodyRecord = {
      id,
      body,
      tag: def.tag,
      kinematic,
      prevX: def.x,
      prevY: def.y,
      prevZ: def.z,
      prevQx: rot.x,
      prevQy: rot.y,
      prevQz: rot.z,
      prevQw: rot.w,
      currX: def.x,
      currY: def.y,
      currZ: def.z,
      currQx: rot.x,
      currQy: rot.y,
      currQz: rot.z,
      currQw: rot.w,
    };
    this._records.set(id, record);
    this._cannonToId.set(body.id, id);
    return id;
  }

  private _createShape(shape: Body3DDef["shape"]): Shape {
    switch (shape.kind) {
      case "sphere":
        return new Sphere(shape.radius);
      case "box":
        return new Box(new Vec3(shape.width / 2, shape.height / 2, shape.depth / 2));
      case "plane":
        return new Plane();
    }
  }

  /** Per-body material that contacts the shared world material with the given props. */
  private _makeBodyMaterial(friction?: number, restitution?: number): Material {
    const mat = new Material();
    this._world.addContactMaterial(
      new ContactMaterial(mat, this._worldMaterial, {
        friction: friction ?? this._defaultFriction,
        restitution: restitution ?? this._defaultRestitution,
      }),
    );
    return mat;
  }

  public removeBody(id: BodyId): void {
    if (this._stepping) {
      this._removeQueue.push(id);
      return;
    }
    this._removeNow(id);
  }

  private _removeNow(id: BodyId): void {
    const record = this._records.get(id);
    if (!record) return;
    this._world.removeBody(record.body);
    this._records.delete(id);
    this._cannonToId.delete(record.body.id);
  }

  private _flushRemovals(): void {
    if (this._removeQueue.length === 0) return;
    for (const id of this._removeQueue) this._removeNow(id);
    this._removeQueue.length = 0;
  }

  //  FORCES & MOTION

  public applyForce(id: BodyId, fx: number, fy: number, fz: number): void {
    const body = this._records.get(id)?.body;
    if (!body) return;
    body.wakeUp();
    this._scratchVec.set(fx, fy, fz);
    body.applyForce(this._scratchVec); // cannon copies the vector, so a reusable scratch is safe
  }

  public applyImpulse(id: BodyId, ix: number, iy: number, iz: number): void {
    const body = this._records.get(id)?.body;
    if (!body) return;
    body.wakeUp();
    this._scratchVec.set(ix, iy, iz);
    body.applyImpulse(this._scratchVec);
  }

  public setVelocity(id: BodyId, vx: number, vy: number, vz: number): void {
    const body = this._records.get(id)?.body;
    if (!body) return;
    body.velocity.set(vx, vy, vz);
    body.wakeUp();
  }

  public setAngularVelocity(id: BodyId, wx: number, wy: number, wz: number): void {
    const body = this._records.get(id)?.body;
    if (!body) return;
    body.angularVelocity.set(wx, wy, wz);
    body.wakeUp();
  }

  /**
   * Put a body to sleep immediately: the solver skips it (it won't move or jitter)
   * until something wakes it — a {@link wakeUp} call, an applied force/velocity, or
   * a collision. Lets callers simulate only part of the world. No-op for unknown ids.
   */
  public sleep(id: BodyId): void {
    this._records.get(id)?.body.sleep();
  }

  /** Wake a sleeping body so it simulates again. No-op for unknown ids. */
  public wakeUp(id: BodyId): void {
    this._records.get(id)?.body.wakeUp();
  }

  /**
   * Set the friction of the shared world contact material at runtime — governs
   * contacts between bodies that use the default material (those created without a
   * per-body `friction`/`restitution`). Lets callers briefly make the pile slippery
   * (e.g. to fluidise it) and restore it after. Bodies with a custom material are
   * unaffected.
   */
  public setDefaultFriction(friction: number): void {
    this._defaultFriction = friction;
    this._world.defaultContactMaterial.friction = friction;
  }

  /** Current default contact friction (so callers can restore it after a change). */
  public get defaultFriction(): number {
    return this._defaultFriction;
  }

  /**
   * Teleport a kinematic body to `(x, y, z)` and zero its velocity. cannon-es
   * integrates kinematic bodies by their velocity, so this is a discrete
   * reposition — for continuous, momentum-transferring motion drive the body
   * with {@link setVelocity} instead. No-op for non-kinematic bodies.
   */
  public setKinematicTarget(id: BodyId, x: number, y: number, z: number): void {
    const record = this._records.get(id);
    if (!record || !record.kinematic) return;
    const { body } = record;
    body.position.set(x, y, z);
    body.velocity.set(0, 0, 0);
    // Snap interpolation snapshots so the teleport reads as instant rather than
    // being lerped from the old pose over the next frame.
    record.prevX = record.currX = x;
    record.prevY = record.currY = y;
    record.prevZ = record.currZ = z;
    record.prevQx = record.currQx;
    record.prevQy = record.currQy;
    record.prevQz = record.currQz;
    record.prevQw = record.currQw;
  }

  //  READ STATE

  public getTransform(id: BodyId, out?: Transform3D): Transform3D {
    const r = this._records.get(id);
    if (!r) throw new Error(`Physics3DManager.getTransform: unknown body ${id}`);
    const t = out ?? { x: 0, y: 0, z: 0, qx: 0, qy: 0, qz: 0, qw: 1 };
    if (this._interpolation) {
      const a = this._accumulator.alpha;
      t.x = r.prevX + (r.currX - r.prevX) * a;
      t.y = r.prevY + (r.currY - r.prevY) * a;
      t.z = r.prevZ + (r.currZ - r.prevZ) * a;
      // nlerp the orientation, taking the shortest arc: if the snapshots are in
      // opposite hemispheres (dot < 0), flip curr so the lerp doesn't swing the
      // long way round (or collapse toward the zero quaternion) on fast spins.
      const dot = r.prevQx * r.currQx + r.prevQy * r.currQy + r.prevQz * r.currQz + r.prevQw * r.currQw;
      const s = dot < 0 ? -1 : 1;
      let qx = r.prevQx + (r.currQx * s - r.prevQx) * a;
      let qy = r.prevQy + (r.currQy * s - r.prevQy) * a;
      let qz = r.prevQz + (r.currQz * s - r.prevQz) * a;
      let qw = r.prevQw + (r.currQw * s - r.prevQw) * a;
      const len = Math.hypot(qx, qy, qz, qw) || 1;
      qx /= len;
      qy /= len;
      qz /= len;
      qw /= len;
      t.qx = qx;
      t.qy = qy;
      t.qz = qz;
      t.qw = qw;
    } else {
      t.x = r.currX;
      t.y = r.currY;
      t.z = r.currZ;
      t.qx = r.currQx;
      t.qy = r.currQy;
      t.qz = r.currQz;
      t.qw = r.currQw;
    }
    return t;
  }

  /** Current velocity. Throws for an unknown id (same contract as getTransform). */
  public getVelocity(id: BodyId, out?: Vec3Like): Vec3Like {
    const body = this._records.get(id)?.body;
    if (!body) throw new Error(`Physics3DManager.getVelocity: unknown body ${id}`);
    const t = out ?? { x: 0, y: 0, z: 0 };
    t.x = body.velocity.x;
    t.y = body.velocity.y;
    t.z = body.velocity.z;
    return t;
  }

  //  QUERIES (AABB-based, coarse — mirrors the 2D module's point/region queries)

  /** Body ids whose (axis-aligned bounding box) contains the point. */
  public queryPoint(x: number, y: number, z: number): readonly BodyId[] {
    const ids: BodyId[] = [];
    for (const [id, r] of this._records) {
      r.body.updateAABB();
      const { lowerBound: lo, upperBound: hi } = r.body.aabb;
      if (x >= lo.x && x <= hi.x && y >= lo.y && y <= hi.y && z >= lo.z && z <= hi.z) ids.push(id);
    }
    return ids;
  }

  /** Body ids whose bounding box overlaps the given AABB. */
  public queryAABB(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number): readonly BodyId[] {
    const ids: BodyId[] = [];
    for (const [id, r] of this._records) {
      r.body.updateAABB();
      const { lowerBound: lo, upperBound: hi } = r.body.aabb;
      if (lo.x <= maxX && hi.x >= minX && lo.y <= maxY && hi.y >= minY && lo.z <= maxZ && hi.z >= minZ) {
        ids.push(id);
      }
    }
    return ids;
  }

  public getTag(id: BodyId): string | undefined {
    return this._records.get(id)?.tag;
  }

  public has(id: BodyId): boolean {
    return this._records.has(id);
  }

  public get bodyCount(): number {
    return this._records.size;
  }

  //  QUERIES

  /**
   * Nearest body hit by the ray from `(x1,y1,z1)` to `(x2,y2,z2)`, or null.
   * Pass `filter.collisionMask` (and optionally `collisionGroup`) to ignore
   * bodies whose `collisionGroup` is masked out — e.g. shoot a pick ray that
   * passes through walls and only hits gameplay bodies.
   */
  public raycast(
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number,
    filter?: { collisionGroup?: number; collisionMask?: number },
  ): RaycastHit3D | null {
    this._rayFrom.set(x1, y1, z1);
    this._rayTo.set(x2, y2, z2);
    const options: RayOptions = {};
    if (filter?.collisionGroup !== undefined) options.collisionFilterGroup = filter.collisionGroup;
    if (filter?.collisionMask !== undefined) options.collisionFilterMask = filter.collisionMask;
    this._rayResult.reset();
    const hit = this._world.raycastClosest(this._rayFrom, this._rayTo, options, this._rayResult);
    if (!hit || !this._rayResult.body) return null;
    const id = this._cannonToId.get(this._rayResult.body.id);
    if (id === undefined) return null;
    const p = this._rayResult.hitPointWorld;
    return { body: id, x: p.x, y: p.y, z: p.z };
  }

  //  EVENTS

  public onCollisionStart(cb: (a: BodyId, b: BodyId, contact: ContactInfo3D) => void): Unsubscribe {
    return this._events.onCollisionStart(cb);
  }

  public onCollisionEnd(cb: (a: BodyId, b: BodyId) => void): Unsubscribe {
    return this._events.onCollisionEnd(cb);
  }

  //  CLEANUP

  public destroy(): void {
    for (const r of this._records.values()) this._world.removeBody(r.body);
    this._records.clear();
    this._cannonToId.clear();
    this._pendingContacts.length = 0;
    this._removeQueue.length = 0;
    this._events.clear();
  }

  //  INTERNAL

  private _snapshotPrev(r: BodyRecord): void {
    r.prevX = r.currX;
    r.prevY = r.currY;
    r.prevZ = r.currZ;
    r.prevQx = r.currQx;
    r.prevQy = r.currQy;
    r.prevQz = r.currQz;
    r.prevQw = r.currQw;
  }

  private _snapshotCurr(r: BodyRecord): void {
    const p = r.body.position;
    const q = r.body.quaternion;
    r.currX = p.x;
    r.currY = p.y;
    r.currZ = p.z;
    r.currQx = q.x;
    r.currQy = q.y;
    r.currQz = q.z;
    r.currQw = q.w;
  }

  private _onContact(e: ContactEvent, kind: "start" | "end"): void {
    if (!e.bodyA || !e.bodyB) return;
    const aId = this._cannonToId.get(e.bodyA.id);
    const bId = this._cannonToId.get(e.bodyB.id);
    if (aId === undefined || bId === undefined) return;
    if (kind === "start") {
      const pa = e.bodyA.position;
      const pb = e.bodyB.position;
      let nx = pb.x - pa.x;
      let ny = pb.y - pa.y;
      let nz = pb.z - pa.z;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;
      this._pendingContacts.push({
        kind: "start",
        a: aId,
        b: bId,
        x: (pa.x + pb.x) / 2,
        y: (pa.y + pb.y) / 2,
        z: (pa.z + pb.z) / 2,
        nx,
        ny,
        nz,
      });
    } else {
      this._pendingContacts.push({ kind: "end", a: aId, b: bId });
    }
  }

  private _drainContacts(): void {
    if (this._pendingContacts.length === 0) return;
    const contacts = this._pendingContacts.splice(0, this._pendingContacts.length);
    this._stepping = true;
    try {
      for (const c of contacts) {
        if (!this._records.has(c.a) || !this._records.has(c.b)) continue;
        if (c.kind === "start") {
          this._events.emitCollisionStart(c.a, c.b, {
            x: c.x,
            y: c.y,
            z: c.z,
            normalX: c.nx,
            normalY: c.ny,
            normalZ: c.nz,
          });
        } else {
          this._events.emitCollisionEnd(c.a, c.b);
        }
      }
    } finally {
      this._stepping = false;
    }
  }
}
