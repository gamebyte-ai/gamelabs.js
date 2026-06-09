/**
 * Opaque handle to a 3D physics body. Issued by `Physics3DManager.createBody`
 * and used for every subsequent operation and in collision events. Game code
 * maps these to gameplay entities (and to view objects) itself.
 */
export type BodyId = number;

/** Body simulation kind. */
export type Body3DType =
  /** Affected by gravity, forces, and collisions. */
  | "dynamic"
  /** Immovable, infinite mass (ground, walls). */
  | "static"
  /** Gravity-free; driven by the game via `setVelocity`/`setKinematicTarget`; pushes dynamics. */
  | "kinematic";

/** Collision shape, centered at the body origin. */
export type Shape3D =
  | { kind: "sphere"; radius: number }
  /** Full extents (not half) along each axis. */
  | { kind: "box"; width: number; height: number; depth: number }
  /** Infinite ground plane; faces +Z in its local space (rotate the body to orient). */
  | { kind: "plane" };

/** Quaternion components. */
export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

/** Definition passed to `createBody`. */
export interface Body3DDef {
  shape: Shape3D;
  /** Initial position (world space, meters). */
  x: number;
  y: number;
  z: number;
  /** Initial orientation quaternion. Default identity `(0,0,0,1)`. */
  rotation?: Quat;
  /** Default "dynamic". */
  type?: Body3DType;
  /** Mass for dynamic bodies. Default 1. Ignored for static/kinematic (treated as 0). */
  mass?: number;
  /**
   * Surface friction for contacts against the shared world material (e.g. the
   * ground). Default is the world's `defaultFriction`. See README for the
   * body-vs-body limitation.
   */
  friction?: number;
  /** Bounciness `[0, 1]` against the world material. Default `defaultRestitution`. */
  restitution?: number;
  /** Sensor (trigger): collisions fire events but produce no physical response. */
  isSensor?: boolean;
  /** Collision group bitmask (cannon-es semantics). Default 1. */
  collisionGroup?: number;
  /** Collision mask: which groups this body collides with. Default -1 (all). */
  collisionMask?: number;
  /** Gameplay label surfaced via `getTag`; not interpreted by the engine. */
  tag?: string;
}

/** A body's pose: position + orientation quaternion. Interpolated by default. */
export interface Transform3D {
  x: number;
  y: number;
  z: number;
  qx: number;
  qy: number;
  qz: number;
  qw: number;
}

/** A 3D vector result. */
export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

/** Contact info reported with a collision-start event (approximate in v1; see README). */
export interface ContactInfo3D {
  /** Approximate contact point (world space). */
  x: number;
  y: number;
  z: number;
  /** Approximate contact normal (unit vector) from body A toward body B. */
  normalX: number;
  normalY: number;
  normalZ: number;
}

/** A raycast hit. */
export interface RaycastHit3D {
  body: BodyId;
  /** Hit point in world space. */
  x: number;
  y: number;
  z: number;
}

/** Configuration for a `Physics3DManager`. */
export interface Physics3DConfig {
  /** Gravity in m/s². Default `{ x: 0, y: -9.82, z: 0 }` (y-up, matches Three world space). */
  gravity?: Vec3Like;
  /** Simulation frequency, steps per second. Default 60. */
  fixedTimestepHz?: number;
  /** Max fixed sub-steps per frame (spiral-of-death guard). Default 5. */
  maxSubSteps?: number;
  /** Interpolate transforms between simulation snapshots. Default true. */
  interpolation?: boolean;
  /** Allow bodies to sleep when at rest. Default true. */
  allowSleep?: boolean;
  /** Default contact friction. Default 0.3. */
  defaultFriction?: number;
  /** Default contact restitution (bounciness). Default 0. */
  defaultRestitution?: number;
}
