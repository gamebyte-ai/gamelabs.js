import * as Matter from "matter-js";

import { FixedStepAccumulator } from "../../../core/utilities/FixedStepAccumulator.js";
import type { Unsubscribe } from "../../../core/events/subscriptions.js";
import { Physics2DEvents } from "./Physics2DEvents.js";
import type { Body2DDef, BodyId, ContactInfo2D, Physics2DConfig, RaycastHit2D, Transform2D, Vec2 } from "./types.js";

interface BodyRecord {
  readonly id: BodyId;
  readonly body: Matter.Body;
  readonly tag: string | undefined;
  readonly kinematic: boolean;
  // Interpolation snapshots.
  prevX: number;
  prevY: number;
  prevAngle: number;
  currX: number;
  currY: number;
  currAngle: number;
}

type PendingContact =
  | { kind: "start"; a: number; b: number; x: number; y: number; nx: number; ny: number }
  | { kind: "end"; a: number; b: number };

const DEFAULT_CATEGORY = 0x0001;
const DEFAULT_MASK = 0xffffffff;

/**
 * matter-js–backed 2D physics world.
 *
 * Owns the authoritative body state and steps it on a fixed timestep. Game
 * code creates bodies, applies forces, reads (interpolated) transforms, and
 * subscribes to collisions — all through this typed API. `matter-js` types
 * never leak across the boundary, so controllers stay engine-agnostic and the
 * view layer never touches physics.
 *
 * Lifecycle is wired by the app, not the module (see README): resolve from DI
 * in `postInitialize()` and register `step` with the `UpdateManager` so it
 * runs before gameplay controllers each frame.
 */
export class Physics2DManager {
  private readonly _engine: Matter.Engine;
  private readonly _accumulator: FixedStepAccumulator;
  private readonly _interpolation: boolean;
  private readonly _events = new Physics2DEvents();

  private readonly _records = new Map<BodyId, BodyRecord>();
  /** matter-js body id → our BodyId, for mapping collision events back. */
  private readonly _matterToId = new Map<number, BodyId>();
  private _nextId = 1;

  /** Contacts captured during a step, drained (and emitted) after substeps. */
  private readonly _pendingContacts: PendingContact[] = [];
  /** Removals requested while stepping/draining, applied after the step. */
  private readonly _removeQueue: BodyId[] = [];
  private _stepping = false;

  public constructor(config?: Physics2DConfig) {
    const gravity = config?.gravity ?? { x: 0, y: 1 };
    const gravityScale = config?.gravityScale ?? 0.001;

    this._engine = Matter.Engine.create({
      enableSleeping: config?.allowSleep ?? true,
      gravity: { x: gravity.x, y: gravity.y, scale: gravityScale },
    });

    this._accumulator = new FixedStepAccumulator({
      hz: config?.fixedTimestepHz ?? 60,
      maxSubSteps: config?.maxSubSteps ?? 5,
    });
    this._interpolation = config?.interpolation ?? true;

    Matter.Events.on(this._engine, "collisionStart", (e) => this._onCollision(e, "start"));
    Matter.Events.on(this._engine, "collisionEnd", (e) => this._onCollision(e, "end"));
  }

  //  STEP

  /**
   * Advance the simulation by `dtSeconds` of wall-clock time. Runs zero or
   * more fixed sub-steps (frame-rate independent) and then drains collision
   * events. Forces/velocities set by game code take effect on the next step.
   */
  public step(dtSeconds: number): void {
    const steps = this._accumulator.consume(dtSeconds);
    if (steps === 0) return;

    this._stepping = true;
    const deltaMs = this._accumulator.fixedDt * 1000;
    for (let i = 0; i < steps; i++) {
      // Snapshot current → previous for interpolation before integrating.
      for (const r of this._records.values()) {
        r.prevX = r.currX;
        r.prevY = r.currY;
        r.prevAngle = r.currAngle;
      }
      Matter.Engine.update(this._engine, deltaMs);
      for (const r of this._records.values()) {
        r.currX = r.body.position.x;
        r.currY = r.body.position.y;
        r.currAngle = r.body.angle;
      }
    }
    this._stepping = false;

    this._drainContacts();
    this._flushRemovals();
  }

  //  BODY LIFECYCLE

  public createBody(def: Body2DDef): BodyId {
    const id = this._nextId++;
    const kinematic = def.type === "kinematic";
    // matter-js has no first-class kinematic body and no per-body gravity
    // toggle. A static body is gravity-free, infinite-mass, and still resolves
    // penetration against dynamics (pushing them) — so we back "kinematic"
    // with a static body that the game repositions via `setKinematicTarget`.
    const isStatic = def.type === "static" || kinematic;

    const options: Matter.IChamferableBodyDefinition = {
      isStatic,
      isSensor: def.isSensor ?? false,
      angle: def.angle ?? 0,
      collisionFilter: {
        category: def.collisionCategory ?? DEFAULT_CATEGORY,
        mask: def.collisionMask ?? DEFAULT_MASK,
      },
    };
    if (def.density !== undefined) options.density = def.density;
    if (def.friction !== undefined) options.friction = def.friction;
    if (def.frictionAir !== undefined) options.frictionAir = def.frictionAir;
    if (def.restitution !== undefined) options.restitution = def.restitution;

    const body = this._createMatterBody(def, options);
    Matter.Composite.add(this._engine.world, body);

    const record: BodyRecord = {
      id,
      body,
      tag: def.tag,
      kinematic,
      prevX: def.x,
      prevY: def.y,
      prevAngle: def.angle ?? 0,
      currX: def.x,
      currY: def.y,
      currAngle: def.angle ?? 0,
    };
    this._records.set(id, record);
    this._matterToId.set(body.id, id);
    return id;
  }

  private _createMatterBody(def: Body2DDef, options: Matter.IChamferableBodyDefinition): Matter.Body {
    const { shape, x, y } = def;
    switch (shape.kind) {
      case "circle":
        return Matter.Bodies.circle(x, y, shape.radius, options);
      case "rect":
        return Matter.Bodies.rectangle(x, y, shape.width, shape.height, options);
      case "polygon": {
        const verts = shape.vertices.map((v) => Matter.Vector.create(v.x, v.y));
        return Matter.Bodies.fromVertices(x, y, [verts], options);
      }
    }
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
    Matter.Composite.remove(this._engine.world, record.body);
    this._records.delete(id);
    this._matterToId.delete(record.body.id);
  }

  private _flushRemovals(): void {
    if (this._removeQueue.length === 0) return;
    for (const id of this._removeQueue) this._removeNow(id);
    this._removeQueue.length = 0;
  }

  //  FORCES & MOTION

  public applyForce(id: BodyId, fx: number, fy: number): void {
    const body = this._records.get(id)?.body;
    if (!body) return;
    Matter.Body.applyForce(body, body.position, { x: fx, y: fy });
  }

  public applyImpulse(id: BodyId, ix: number, iy: number): void {
    const body = this._records.get(id)?.body;
    if (!body || body.mass <= 0 || !Number.isFinite(body.mass)) return;
    Matter.Body.setVelocity(body, {
      x: body.velocity.x + ix / body.mass,
      y: body.velocity.y + iy / body.mass,
    });
  }

  public setVelocity(id: BodyId, vx: number, vy: number): void {
    const body = this._records.get(id)?.body;
    if (!body) return;
    Matter.Body.setVelocity(body, { x: vx, y: vy });
  }

  public setAngularVelocity(id: BodyId, omega: number): void {
    const body = this._records.get(id)?.body;
    if (!body) return;
    Matter.Body.setAngularVelocity(body, omega);
  }

  /**
   * Reposition a kinematic body to `(x, y)` (and optionally set its angle).
   * This is the portable way to drive a kinematic body each frame; it still
   * pushes overlapping dynamic bodies out via penetration resolution. No-op
   * for non-kinematic bodies — drive dynamic bodies with forces/impulses.
   */
  public setKinematicTarget(id: BodyId, x: number, y: number, angle?: number): void {
    const record = this._records.get(id);
    if (!record || !record.kinematic) return;
    const { body } = record;
    Matter.Body.setPosition(body, { x, y });
    Matter.Body.setVelocity(body, { x: 0, y: 0 });
    if (angle !== undefined) Matter.Body.setAngle(body, angle);
  }

  //  READ STATE

  /**
   * Current pose, interpolated by the leftover accumulator time when
   * interpolation is enabled. Pass `out` to avoid allocation. Throws for an
   * unknown id (a removed body's binding should be dropped, not queried).
   */
  public getTransform(id: BodyId, out?: Transform2D): Transform2D {
    const r = this._records.get(id);
    if (!r) throw new Error(`Physics2DManager.getTransform: unknown body ${id}`);
    const target = out ?? { x: 0, y: 0, angle: 0 };
    if (this._interpolation) {
      const a = this._accumulator.alpha;
      target.x = r.prevX + (r.currX - r.prevX) * a;
      target.y = r.prevY + (r.currY - r.prevY) * a;
      target.angle = r.prevAngle + (r.currAngle - r.prevAngle) * a;
    } else {
      target.x = r.currX;
      target.y = r.currY;
      target.angle = r.currAngle;
    }
    return target;
  }

  public getVelocity(id: BodyId, out?: Vec2): Vec2 {
    const body = this._records.get(id)?.body;
    const target = out ?? { x: 0, y: 0 };
    if (body) {
      target.x = body.velocity.x;
      target.y = body.velocity.y;
    } else {
      target.x = 0;
      target.y = 0;
    }
    return target;
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

  public queryPoint(x: number, y: number): readonly BodyId[] {
    const bodies = Matter.Query.point(this._allBodies(), { x, y });
    return this._mapBodies(bodies);
  }

  public queryAABB(minX: number, minY: number, maxX: number, maxY: number): readonly BodyId[] {
    const bounds = Matter.Bounds.create([
      { x: minX, y: minY },
      { x: maxX, y: maxY },
    ]);
    const bodies = Matter.Query.region(this._allBodies(), bounds);
    return this._mapBodies(bodies);
  }

  /**
   * Cast a ray from `(x1,y1)` to `(x2,y2)` and return the nearest hit, or null.
   * Note: matter-js's ray query is AABB-broadphase based, so it is approximate
   * for thin/rotated shapes near each other — adequate for gameplay picking,
   * not for precise narrow-phase casts.
   */
  public raycast(x1: number, y1: number, x2: number, y2: number): RaycastHit2D | null {
    const collisions = Matter.Query.ray(this._allBodies(), { x: x1, y: y1 }, { x: x2, y: y2 });
    if (collisions.length === 0) return null;
    let best: Matter.Collision | null = null;
    let bestDistSq = Infinity;
    for (const c of collisions) {
      const body = c.bodyA;
      const dx = body.position.x - x1;
      const dy = body.position.y - y1;
      const distSq = dx * dx + dy * dy;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        best = c;
      }
    }
    if (!best) return null;
    const id = this._matterToId.get(best.bodyA.id);
    if (id === undefined) return null;
    return { body: id, x: best.bodyA.position.x, y: best.bodyA.position.y };
  }

  //  EVENTS

  public onCollisionStart(cb: (a: BodyId, b: BodyId, contact: ContactInfo2D) => void): Unsubscribe {
    return this._events.onCollisionStart(cb);
  }

  public onCollisionEnd(cb: (a: BodyId, b: BodyId) => void): Unsubscribe {
    return this._events.onCollisionEnd(cb);
  }

  //  CLEANUP

  public destroy(): void {
    // The engine (and its event listeners, which only reference this manager)
    // is discarded here, so there is no listener to detach explicitly.
    Matter.Composite.clear(this._engine.world, false, true);
    Matter.Engine.clear(this._engine);
    this._records.clear();
    this._matterToId.clear();
    this._pendingContacts.length = 0;
    this._removeQueue.length = 0;
    this._events.clear();
  }

  //  INTERNAL

  private _onCollision(e: Matter.IEventCollision<Matter.Engine>, kind: "start" | "end"): void {
    for (const pair of e.pairs) {
      const aId = this._resolveMatterId(pair.bodyA);
      const bId = this._resolveMatterId(pair.bodyB);
      if (aId === undefined || bId === undefined) continue;
      if (kind === "start") {
        const support = pair.collision.supports[0];
        const normal = pair.collision.normal;
        this._pendingContacts.push({
          kind: "start",
          a: aId,
          b: bId,
          x: support?.x ?? (pair.bodyA.position.x + pair.bodyB.position.x) / 2,
          y: support?.y ?? (pair.bodyA.position.y + pair.bodyB.position.y) / 2,
          nx: normal.x,
          ny: normal.y,
        });
      } else {
        this._pendingContacts.push({ kind: "end", a: aId, b: bId });
      }
    }
  }

  /** Map a matter body (or its compound parent) to our BodyId. */
  private _resolveMatterId(body: Matter.Body): BodyId | undefined {
    const direct = this._matterToId.get(body.id);
    if (direct !== undefined) return direct;
    return body.parent ? this._matterToId.get(body.parent.id) : undefined;
  }

  private _drainContacts(): void {
    if (this._pendingContacts.length === 0) return;
    // Snapshot then clear, so a removeBody() inside a callback (which only
    // queues during _stepping=false here) and any re-entrancy stay sane.
    const contacts = this._pendingContacts.splice(0, this._pendingContacts.length);
    this._stepping = true;
    try {
      for (const c of contacts) {
        // Skip contacts whose bodies were removed since capture.
        if (!this._records.has(c.a) || !this._records.has(c.b)) continue;
        if (c.kind === "start") {
          this._events.emitCollisionStart(c.a, c.b, { x: c.x, y: c.y, normalX: c.nx, normalY: c.ny });
        } else {
          this._events.emitCollisionEnd(c.a, c.b);
        }
      }
    } finally {
      this._stepping = false;
    }
  }

  private _allBodies(): Matter.Body[] {
    const bodies: Matter.Body[] = [];
    for (const r of this._records.values()) bodies.push(r.body);
    return bodies;
  }

  private _mapBodies(bodies: Matter.Body[]): BodyId[] {
    const ids: BodyId[] = [];
    for (const b of bodies) {
      const id = this._resolveMatterId(b);
      if (id !== undefined) ids.push(id);
    }
    return ids;
  }
}
