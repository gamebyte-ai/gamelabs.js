import type { Body3DDef, BodyId, Transform3D } from "./types.js";

/** Minimal physics world the stage needs. Satisfied by Physics3DManager and FakePhysics3D. */
export interface Physics3DWorld {
  createBody(def: Body3DDef): BodyId;
  removeBody(id: BodyId): void;
  getTransform(id: BodyId, out?: Transform3D): Transform3D;
  has(id: BodyId): boolean;
}

/**
 * The render side of a spawned entity. The view implements it: `setTransform`
 * pushes the body's pose (position + quaternion) onto a mesh, `dispose` tears
 * the mesh down. The stage holds only this interface, staying renderer-agnostic.
 * The transform passed to `setTransform` is a reused scratch object — read it,
 * don't retain it.
 */
export interface Physics3DEntityView {
  setTransform(t: Readonly<Transform3D>): void;
  dispose(): void;
}

/** Handle to a live entity (a body paired with its view). `despawn` removes both. */
export interface Physics3DEntity {
  readonly id: BodyId;
  despawn(): void;
}

/**
 * 3D counterpart to `Physics2DStage`. One `spawn(body, view)` creates the body
 * in the central world, pairs it with a view, and returns a handle; `sync()`
 * pushes each body's interpolated transform onto its view and disposes views of
 * bodies that vanished. The body lives in the central simulation — only the
 * body↔view pairing is encapsulated. Compare `Physics3DSyncBag` (bind-existing
 * only).
 */
export class Physics3DStage {
  private readonly _pairs = new Map<BodyId, Physics3DEntityView>();
  private readonly _scratch: Transform3D = { x: 0, y: 0, z: 0, qx: 0, qy: 0, qz: 0, qw: 1 };

  public constructor(private readonly _world: Physics3DWorld) {}

  public spawn(body: Body3DDef, view: Physics3DEntityView): Physics3DEntity {
    const id = this._world.createBody(body);
    this._pairs.set(id, view);
    return {
      id,
      despawn: () => this.despawn(id),
    };
  }

  public despawn(id: BodyId): void {
    const view = this._pairs.get(id);
    if (!view) return;
    this._pairs.delete(id);
    this._world.removeBody(id);
    view.dispose();
  }

  public sync(): void {
    for (const [id, view] of this._pairs) {
      if (!this._world.has(id)) {
        this._pairs.delete(id);
        view.dispose();
        continue;
      }
      view.setTransform(this._world.getTransform(id, this._scratch));
    }
  }

  public has(id: BodyId): boolean {
    return this._pairs.has(id);
  }

  public get size(): number {
    return this._pairs.size;
  }

  public clear(): void {
    for (const [id, view] of this._pairs) {
      this._world.removeBody(id);
      view.dispose();
    }
    this._pairs.clear();
  }
}
