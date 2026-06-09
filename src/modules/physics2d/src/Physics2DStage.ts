import type { Body2DDef, BodyId, Transform2D } from "./types.js";

/**
 * Minimal physics world the stage needs. Both `Physics2DManager` and
 * `FakePhysics2D` satisfy it structurally, so a stage can be unit-tested with
 * the engine-free fake.
 */
export interface Physics2DWorld {
  createBody(def: Body2DDef): BodyId;
  removeBody(id: BodyId): void;
  getTransform(id: BodyId, out?: Transform2D): Transform2D;
  has(id: BodyId): boolean;
}

/**
 * The render side of a spawned entity. The caller (the view) implements this:
 * `setTransform` pushes the body's pose onto a graphic, `dispose` tears the
 * graphic down. The stage owns nothing renderer-specific — it only holds this
 * interface, so `physics2d` stays renderer-agnostic.
 */
export interface Physics2DEntityView {
  setTransform(x: number, y: number, angle: number): void;
  dispose(): void;
}

/** Handle to a live entity (a body paired with its view). `despawn` removes both. */
export interface Physics2DEntity {
  readonly id: BodyId;
  despawn(): void;
}

/**
 * Spawns and owns body↔view entities — the "prefab" ergonomics layer over the
 * raw manager.
 *
 * One `spawn(body, view)` call creates the physics body (in the central world),
 * pairs it with a view, and tracks the pair; the returned handle's `despawn()`
 * removes both. `sync()` (called each frame from a controller's update tick)
 * pushes every live body's interpolated transform onto its view, and disposes
 * the view of any body that disappeared from the world (e.g. removed
 * elsewhere). This keeps a physics-backed object's whole lifetime in one place
 * instead of spread across body-creation, view-creation, and sync wiring.
 *
 * The body lives in the central simulation (this does not move physics into the
 * view); only the body↔view pairing is encapsulated here. Compare
 * `Physics2DSyncBag`, which only binds transforms for bodies created elsewhere.
 */
export class Physics2DStage {
  private readonly _pairs = new Map<BodyId, Physics2DEntityView>();
  private readonly _scratch: Transform2D = { x: 0, y: 0, angle: 0 };

  public constructor(private readonly _world: Physics2DWorld) {}

  /** Create a body and pair it with `view`. Returns a handle to despawn both. */
  public spawn(body: Body2DDef, view: Physics2DEntityView): Physics2DEntity {
    const id = this._world.createBody(body);
    this._pairs.set(id, view);
    return {
      id,
      despawn: () => this.despawn(id),
    };
  }

  /** Remove a body and dispose its view. Safe to call more than once. */
  public despawn(id: BodyId): void {
    const view = this._pairs.get(id);
    if (!view) return;
    this._pairs.delete(id);
    this._world.removeBody(id);
    view.dispose();
  }

  /** Push every live body's transform onto its view; dispose views of vanished bodies. */
  public sync(): void {
    for (const [id, view] of this._pairs) {
      if (!this._world.has(id)) {
        this._pairs.delete(id);
        view.dispose();
        continue;
      }
      const t = this._world.getTransform(id, this._scratch);
      view.setTransform(t.x, t.y, t.angle);
    }
  }

  public has(id: BodyId): boolean {
    return this._pairs.has(id);
  }

  public get size(): number {
    return this._pairs.size;
  }

  /** Despawn every entity (removes all bodies, disposes all views). */
  public clear(): void {
    for (const [id, view] of this._pairs) {
      this._world.removeBody(id);
      view.dispose();
    }
    this._pairs.clear();
  }
}
