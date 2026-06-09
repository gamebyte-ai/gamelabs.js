/**
 * Opaque handle to a physics body. Issued by `Physics2DManager.createBody`
 * and used for every subsequent operation and in collision events. Game code
 * maps these to gameplay entities (and to view objects) itself — the physics
 * world holds no reference to views or game state.
 */
export type BodyId = number;

/** Body simulation kind. */
export type Body2DType =
  /** Affected by gravity, forces, and collisions. */
  | "dynamic"
  /** Immovable, infinite mass (walls, ground). */
  | "static"
  /**
   * Gravity-free, unaffected by collisions/forces; driven by the game via
   * `setVelocity` / `setKinematicTarget`. Pushes dynamic bodies it touches.
   */
  | "kinematic";

/** Collision shape, positioned at the body's center (local origin). */
export type Shape2D =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; width: number; height: number }
  /** Convex polygon. Vertices are relative to the body center, CCW. */
  | { kind: "polygon"; vertices: ReadonlyArray<{ x: number; y: number }> };

/** Definition passed to `createBody`. All fields except `shape`/`x`/`y` are optional. */
export interface Body2DDef {
  shape: Shape2D;
  /** Initial center position (world space, pixels). */
  x: number;
  y: number;
  /** Initial rotation, radians. Default 0. */
  angle?: number;
  /** Default "dynamic". */
  type?: Body2DType;
  /** Mass per unit area. Default engine value. Ignored for static/kinematic. */
  density?: number;
  /** Surface friction `[0, 1+]`. Default engine value. */
  friction?: number;
  /** Air resistance applied each step `[0, 1]`. Default engine value. */
  frictionAir?: number;
  /** Bounciness `[0, 1]`. Default engine value. */
  restitution?: number;
  /**
   * Sensor (trigger): collisions fire events but produce no physical
   * response. Use for pickups, zones, detectors.
   */
  isSensor?: boolean;
  /** Collision category bitmask (matter-js semantics). Default 0x0001. */
  collisionCategory?: number;
  /** Collision mask bitmask: which categories this body collides with. Default 0xFFFFFFFF. */
  collisionMask?: number;
  /**
   * Gameplay label surfaced on the body via `getTag` and useful when handling
   * collision events (e.g. "player", "enemy", "pickup"). Not interpreted by
   * the engine.
   */
  tag?: string;
}

/** A body's pose. Interpolated when `interpolation` is enabled (default). */
export interface Transform2D {
  x: number;
  y: number;
  /** Rotation in radians. */
  angle: number;
}

/** A 2D vector result (velocity, etc.). */
export interface Vec2 {
  x: number;
  y: number;
}

/** Contact information reported with a collision-start event. */
export interface ContactInfo2D {
  /** Approximate contact point in world space. */
  x: number;
  y: number;
  /** Contact normal (unit vector), pointing from body A toward body B. */
  normalX: number;
  normalY: number;
}

/** A raycast hit. */
export interface RaycastHit2D {
  body: BodyId;
  /** Hit point in world space. */
  x: number;
  y: number;
}

/** Configuration for a `Physics2DManager`. */
export interface Physics2DConfig {
  /**
   * Gravity vector in matter-js's native gravity units (NOT px/s²).
   * Default `{ x: 0, y: 1 }` (downward, since 2D HUD/Pixi space is y-down).
   * Tune together with `gravityScale`.
   */
  gravity?: Vec2;
  /** matter-js gravity scale. Default 0.001 (matter-js's own default). */
  gravityScale?: number;
  /** Simulation frequency, steps per second. Default 60. */
  fixedTimestepHz?: number;
  /** Max fixed sub-steps per frame (spiral-of-death guard). Default 5. */
  maxSubSteps?: number;
  /**
   * Interpolate transforms between the previous and current simulation
   * snapshot using the leftover accumulator time, removing visual stutter
   * when render Hz differs from physics Hz. Default true.
   */
  interpolation?: boolean;
  /** Allow bodies to sleep when at rest (perf). Default true. */
  allowSleep?: boolean;
}
