import type { Unsubscribe } from "../../../core/events/subscriptions.js";
import type { BodyId, Transform2D } from "./types.js";

/** Minimal read surface a sync bag needs — satisfied by Physics2DManager and FakePhysics2D. */
export interface Transform2DSource {
  has(id: BodyId): boolean;
  getTransform(id: BodyId, out?: Transform2D): Transform2D;
}

/** Receives a body's current (interpolated) pose to push onto a view object. */
export type Transform2DSink = (x: number, y: number, angle: number) => void;

/**
 * Collapses the per-frame "read each body's transform and push it to its view
 * object" boilerplate that every physics-driven controller would otherwise
 * repeat. The controller binds a body id to a view-updating callback once;
 * `sync()` (called from the controller's update tick) reads each body's
 * interpolated transform and invokes the callback.
 *
 * This is the only coupling between physics bodies and view objects: a
 * one-way push the controller owns. Bindings whose body has been removed are
 * dropped automatically on the next `sync()`.
 */
export class Physics2DSyncBag {
  private readonly _bindings = new Map<BodyId, Transform2DSink>();
  private readonly _scratch: Transform2D = { x: 0, y: 0, angle: 0 };

  public constructor(private readonly _source: Transform2DSource) {}

  /** Bind a body to a view sink. Returns an unsubscribe that removes the binding. */
  public bind(id: BodyId, sink: Transform2DSink): Unsubscribe {
    this._bindings.set(id, sink);
    return () => {
      this._bindings.delete(id);
    };
  }

  public unbind(id: BodyId): void {
    this._bindings.delete(id);
  }

  /** Push every bound body's current transform to its sink; drop stale bindings. */
  public sync(): void {
    for (const [id, sink] of this._bindings) {
      if (!this._source.has(id)) {
        this._bindings.delete(id);
        continue;
      }
      const t = this._source.getTransform(id, this._scratch);
      sink(t.x, t.y, t.angle);
    }
  }

  public get size(): number {
    return this._bindings.size;
  }

  /** Drop all bindings. Does not touch the bodies themselves. */
  public flush(): void {
    this._bindings.clear();
  }
}
