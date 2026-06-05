import type { Unsubscribe } from "../../../core/events/subscriptions.js";
import type { BodyId, ContactInfo3D } from "./types.js";

export type CollisionStart3DCallback = (a: BodyId, b: BodyId, contact: ContactInfo3D) => void;
export type CollisionEnd3DCallback = (a: BodyId, b: BodyId) => void;

/**
 * Event bus for 3D collision lifecycle. The manager drains engine contacts
 * after each `step()` and emits here, so callbacks never run mid-simulation.
 */
export class Physics3DEvents {
  private readonly _startListeners = new Set<CollisionStart3DCallback>();
  private readonly _endListeners = new Set<CollisionEnd3DCallback>();

  public onCollisionStart(cb: CollisionStart3DCallback): Unsubscribe {
    this._startListeners.add(cb);
    return () => this._startListeners.delete(cb);
  }

  public emitCollisionStart(a: BodyId, b: BodyId, contact: ContactInfo3D): void {
    for (const cb of this._startListeners) cb(a, b, contact);
  }

  public onCollisionEnd(cb: CollisionEnd3DCallback): Unsubscribe {
    this._endListeners.add(cb);
    return () => this._endListeners.delete(cb);
  }

  public emitCollisionEnd(a: BodyId, b: BodyId): void {
    for (const cb of this._endListeners) cb(a, b);
  }

  public clear(): void {
    this._startListeners.clear();
    this._endListeners.clear();
  }
}
