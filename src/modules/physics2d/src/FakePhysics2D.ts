import { FixedStepAccumulator } from "../../../core/utilities/FixedStepAccumulator.js";
import type { Unsubscribe } from "../../../core/events/subscriptions.js";
import { Physics2DEvents } from "./Physics2DEvents.js";
import type { Body2DDef, BodyId, Body2DType, ContactInfo2D, Physics2DConfig, RaycastHit2D, Transform2D, Vec2 } from "./types.js";

interface FakeBody {
  id: BodyId;
  x: number;
  y: number;
  angle: number;
  vx: number;
  vy: number;
  omega: number;
  type: Body2DType;
  mass: number;
  tag: string | undefined;
}

/**
 * Engine-free, deterministic stand-in for {@link Physics2DManager} with the
 * same public surface. Drop it into a controller (or DI) in place of the real
 * manager so game logic can be unit-tested without loading matter-js.
 *
 * It runs a trivial semi-implicit Euler integrator (gravity + velocity, no
 * collision detection) on a fixed timestep, so "does the body fall / move"
 * assertions hold. Collisions are not detected — tests drive them explicitly
 * via {@link emitCollisionStart} / {@link emitCollisionEnd}. Gravity here is a
 * plain acceleration in units/s² (unlike matter-js's scaled gravity), which
 * keeps test math obvious.
 */
export class FakePhysics2D {
  private readonly _accumulator: FixedStepAccumulator;
  private readonly _events = new Physics2DEvents();
  private readonly _bodies = new Map<BodyId, FakeBody>();
  private readonly _gx: number;
  private readonly _gy: number;
  private _nextId = 1;

  /** Total fixed sub-steps simulated — handy for asserting step cadence in tests. */
  public stepsRun = 0;

  public constructor(config?: Physics2DConfig) {
    this._gx = config?.gravity?.x ?? 0;
    this._gy = config?.gravity?.y ?? 0;
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
        // Only dynamic bodies integrate. Kinematic bodies are positioned via
        // setKinematicTarget (matching the real managers' portable contract);
        // static bodies never move.
        if (b.type !== "dynamic") continue;
        b.vx += this._gx * h;
        b.vy += this._gy * h;
        b.x += b.vx * h;
        b.y += b.vy * h;
        b.angle += b.omega * h;
      }
      this.stepsRun++;
    }
  }

  public createBody(def: Body2DDef): BodyId {
    const id = this._nextId++;
    this._bodies.set(id, {
      id,
      x: def.x,
      y: def.y,
      angle: def.angle ?? 0,
      vx: 0,
      vy: 0,
      omega: 0,
      type: def.type ?? "dynamic",
      mass: 1,
      tag: def.tag,
    });
    return id;
  }

  public removeBody(id: BodyId): void {
    this._bodies.delete(id);
  }

  public applyForce(id: BodyId, fx: number, fy: number): void {
    const b = this._bodies.get(id);
    if (!b || b.type !== "dynamic") return;
    b.vx += (fx / b.mass) * this._accumulator.fixedDt;
    b.vy += (fy / b.mass) * this._accumulator.fixedDt;
  }

  public applyImpulse(id: BodyId, ix: number, iy: number): void {
    const b = this._bodies.get(id);
    if (!b || b.type !== "dynamic") return;
    b.vx += ix / b.mass;
    b.vy += iy / b.mass;
  }

  public setVelocity(id: BodyId, vx: number, vy: number): void {
    const b = this._bodies.get(id);
    if (!b) return;
    b.vx = vx;
    b.vy = vy;
  }

  public setAngularVelocity(id: BodyId, omega: number): void {
    const b = this._bodies.get(id);
    if (!b) return;
    b.omega = omega;
  }

  public setKinematicTarget(id: BodyId, x: number, y: number, angle?: number): void {
    const b = this._bodies.get(id);
    if (!b || b.type !== "kinematic") return;
    b.x = x;
    b.y = y;
    b.vx = 0;
    b.vy = 0;
    if (angle !== undefined) b.angle = angle;
  }

  public getTransform(id: BodyId, out?: Transform2D): Transform2D {
    const b = this._bodies.get(id);
    if (!b) throw new Error(`FakePhysics2D.getTransform: unknown body ${id}`);
    const t = out ?? { x: 0, y: 0, angle: 0 };
    t.x = b.x;
    t.y = b.y;
    t.angle = b.angle;
    return t;
  }

  public getVelocity(id: BodyId, out?: Vec2): Vec2 {
    const b = this._bodies.get(id);
    const t = out ?? { x: 0, y: 0 };
    t.x = b?.vx ?? 0;
    t.y = b?.vy ?? 0;
    return t;
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

  /** Bodies whose center lies within `radius` (default 0.5) of the point. */
  public queryPoint(x: number, y: number): readonly BodyId[] {
    const ids: BodyId[] = [];
    for (const b of this._bodies.values()) {
      const dx = b.x - x;
      const dy = b.y - y;
      if (dx * dx + dy * dy <= 0.25) ids.push(b.id);
    }
    return ids;
  }

  public queryAABB(minX: number, minY: number, maxX: number, maxY: number): readonly BodyId[] {
    const ids: BodyId[] = [];
    for (const b of this._bodies.values()) {
      if (b.x >= minX && b.x <= maxX && b.y >= minY && b.y <= maxY) ids.push(b.id);
    }
    return ids;
  }

  public raycast(_x1: number, _y1: number, _x2: number, _y2: number): RaycastHit2D | null {
    return null;
  }

  public onCollisionStart(cb: (a: BodyId, b: BodyId, contact: ContactInfo2D) => void): Unsubscribe {
    return this._events.onCollisionStart(cb);
  }

  public onCollisionEnd(cb: (a: BodyId, b: BodyId) => void): Unsubscribe {
    return this._events.onCollisionEnd(cb);
  }

  /** Test hook: fire a collision-start event with an optional contact. */
  public emitCollisionStart(a: BodyId, b: BodyId, contact?: Partial<ContactInfo2D>): void {
    this._events.emitCollisionStart(a, b, {
      x: contact?.x ?? 0,
      y: contact?.y ?? 0,
      normalX: contact?.normalX ?? 0,
      normalY: contact?.normalY ?? 0,
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
