import type { Unsubscribe } from "../../../core/events/subscriptions.js";
import type { BodyId, Transform3D } from "./types.js";

/** Minimal read surface a sync bag needs — satisfied by Physics3DManager and FakePhysics3D. */
export interface Transform3DSource {
  has(id: BodyId): boolean;
  getTransform(id: BodyId, out?: Transform3D): Transform3D;
}

/** Receives a body's current (interpolated) pose to push onto a view object. */
export type Transform3DSink = (t: Readonly<Transform3D>) => void;

/**
 * 3D counterpart to `Physics2DSyncBag`. Binds a body id to a view-updating
 * callback; `sync()` reads each body's interpolated transform (position +
 * quaternion) and invokes the callback. The only coupling between physics
 * bodies and view objects — a one-way push owned by the controller. Bindings
 * whose body has been removed are dropped automatically on the next `sync()`.
 *
 * The sink receives the whole `Transform3D` (7 components) by reference; do
 * not retain it across calls — it is a reused scratch object.
 */
export class Physics3DSyncBag {
  private readonly _bindings = new Map<BodyId, Transform3DSink>();
  private readonly _scratch: Transform3D = { x: 0, y: 0, z: 0, qx: 0, qy: 0, qz: 0, qw: 1 };

  public constructor(private readonly _source: Transform3DSource) {}

  public bind(id: BodyId, sink: Transform3DSink): Unsubscribe {
    this._bindings.set(id, sink);
    return () => {
      this._bindings.delete(id);
    };
  }

  public unbind(id: BodyId): void {
    this._bindings.delete(id);
  }

  public sync(): void {
    for (const [id, sink] of this._bindings) {
      if (!this._source.has(id)) {
        this._bindings.delete(id);
        continue;
      }
      sink(this._source.getTransform(id, this._scratch));
    }
  }

  public get size(): number {
    return this._bindings.size;
  }

  public flush(): void {
    this._bindings.clear();
  }
}
