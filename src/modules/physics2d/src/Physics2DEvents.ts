import type { Unsubscribe } from "../../../core/events/subscriptions.js";
import type { BodyId, ContactInfo2D } from "./types.js";

export type CollisionStart2DCallback = (a: BodyId, b: BodyId, contact: ContactInfo2D) => void;
export type CollisionEnd2DCallback = (a: BodyId, b: BodyId) => void;

/**
 * Event bus for 2D collision lifecycle.
 *
 * The manager drains engine contacts after each `step()` and emits here, so
 * callbacks never run mid-simulation. Controllers subscribe (composing the
 * returned `Unsubscribe` into an `UnsubscribeBag`) and translate body ids
 * into gameplay reactions. The physics world never calls into views.
 */
export class Physics2DEvents {
  private readonly _startListeners = new Set<CollisionStart2DCallback>();
  private readonly _endListeners = new Set<CollisionEnd2DCallback>();

  public onCollisionStart(cb: CollisionStart2DCallback): Unsubscribe {
    this._startListeners.add(cb);
    return () => this._startListeners.delete(cb);
  }

  public emitCollisionStart(a: BodyId, b: BodyId, contact: ContactInfo2D): void {
    for (const cb of this._startListeners) cb(a, b, contact);
  }

  public onCollisionEnd(cb: CollisionEnd2DCallback): Unsubscribe {
    this._endListeners.add(cb);
    return () => this._endListeners.delete(cb);
  }

  public emitCollisionEnd(a: BodyId, b: BodyId): void {
    for (const cb of this._endListeners) cb(a, b);
  }

  /** Drop all listeners (called on manager destroy). */
  public clear(): void {
    this._startListeners.clear();
    this._endListeners.clear();
  }
}
