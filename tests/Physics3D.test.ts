import { describe, it, expect, vi } from "vitest";
import { Physics3DManager } from "../src/modules/physics3d/src/Physics3DManager.js";
import type { BodyId } from "../src/modules/physics3d/src/types.js";

function advance(m: Physics3DManager, seconds: number): void {
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) m.step(dt);
}

describe("Physics3DManager — lifecycle", () => {
  it("creates and removes bodies", () => {
    const m = new Physics3DManager({ gravity: { x: 0, y: 0, z: 0 } });
    const a = m.createBody({ shape: { kind: "sphere", radius: 1 }, x: 0, y: 0, z: 0 });
    const b = m.createBody({ shape: { kind: "box", width: 2, height: 2, depth: 2 }, x: 5, y: 0, z: 0 });
    expect(m.bodyCount).toBe(2);
    m.removeBody(a);
    expect(m.has(a)).toBe(false);
    expect(m.has(b)).toBe(true);
    m.destroy();
  });

  it("getTransform throws for an unknown body", () => {
    const m = new Physics3DManager();
    expect(() => m.getTransform(999 as BodyId)).toThrow();
    m.destroy();
  });
});

describe("Physics3DManager — simulation", () => {
  it("a dynamic body falls under gravity (y decreases, y-up)", () => {
    const m = new Physics3DManager({ gravity: { x: 0, y: -9.82, z: 0 }, interpolation: false });
    const id = m.createBody({ shape: { kind: "sphere", radius: 1 }, x: 0, y: 10, z: 0 });
    advance(m, 0.5);
    const t = m.getTransform(id);
    expect(t.y).toBeLessThan(10);
    // ~½·g·t² ≈ 1.23m drop after 0.5s; allow generous tolerance.
    expect(t.y).toBeLessThan(9.5);
    m.destroy();
  });

  it("a static body stays put under gravity", () => {
    const m = new Physics3DManager({ gravity: { x: 0, y: -9.82, z: 0 }, interpolation: false });
    const id = m.createBody({ shape: { kind: "box", width: 10, height: 1, depth: 10 }, x: 0, y: 0, z: 0, type: "static" });
    advance(m, 1);
    expect(m.getTransform(id).y).toBeCloseTo(0, 3);
    m.destroy();
  });

  it("a bouncing ball on the ground keeps a positive height with restitution", () => {
    const m = new Physics3DManager({ gravity: { x: 0, y: -9.82, z: 0 }, interpolation: false, defaultFriction: 0.1 });
    m.createBody({ shape: { kind: "box", width: 50, height: 1, depth: 50 }, x: 0, y: -0.5, z: 0, type: "static" });
    const ball = m.createBody({ shape: { kind: "sphere", radius: 1 }, x: 0, y: 5, z: 0, restitution: 0.9 });
    advance(m, 3);
    // It should have landed and not fallen through the floor.
    expect(m.getTransform(ball).y).toBeGreaterThan(0);
    m.destroy();
  });
});

describe("Physics3DManager — collisions", () => {
  it("fires collisionStart for two overlapping spheres with mapped ids", () => {
    const m = new Physics3DManager({ gravity: { x: 0, y: 0, z: 0 } });
    const a = m.createBody({ shape: { kind: "sphere", radius: 1 }, x: 0, y: 0, z: 0 });
    const b = m.createBody({ shape: { kind: "sphere", radius: 1 }, x: 0.5, y: 0, z: 0 });
    const seen: Array<[BodyId, BodyId]> = [];
    m.onCollisionStart((x, y) => seen.push([x, y]));
    m.step(1 / 60);
    expect(seen.length).toBeGreaterThanOrEqual(1);
    expect(new Set(seen[0])).toEqual(new Set([a, b]));
    m.destroy();
  });

  it("removeBody() inside a collision callback is safe", () => {
    const m = new Physics3DManager({ gravity: { x: 0, y: 0, z: 0 } });
    m.createBody({ shape: { kind: "sphere", radius: 1 }, x: 0, y: 0, z: 0 });
    m.createBody({ shape: { kind: "sphere", radius: 1 }, x: 0.5, y: 0, z: 0 });
    m.onCollisionStart((x) => m.removeBody(x));
    expect(() => m.step(1 / 60)).not.toThrow();
    expect(m.bodyCount).toBe(1);
    m.destroy();
  });
});

describe("Physics3DManager — queries & kinematic", () => {
  it("raycast hits a body in the ray's path", () => {
    const m = new Physics3DManager({ gravity: { x: 0, y: 0, z: 0 } });
    const id = m.createBody({ shape: { kind: "sphere", radius: 1 }, x: 0, y: 0, z: 0 });
    const hit = m.raycast(0, 5, 0, 0, -5, 0);
    expect(hit).not.toBeNull();
    expect(hit?.body).toBe(id);
    m.destroy();
  });

  it("raycast misses when nothing is in the path", () => {
    const m = new Physics3DManager({ gravity: { x: 0, y: 0, z: 0 } });
    m.createBody({ shape: { kind: "sphere", radius: 1 }, x: 100, y: 0, z: 0 });
    expect(m.raycast(0, 5, 0, 0, -5, 0)).toBeNull();
    m.destroy();
  });

  it("raycast collisionMask passes through filtered bodies", () => {
    const m = new Physics3DManager({ gravity: { x: 0, y: 0, z: 0 } });
    const wall = m.createBody({
      shape: { kind: "box", width: 4, height: 0.5, depth: 4 },
      x: 0,
      y: 2,
      z: 0,
      type: "static",
      collisionGroup: 2,
    });
    const target = m.createBody({ shape: { kind: "sphere", radius: 1 }, x: 0, y: 0, z: 0, collisionGroup: 1 });
    // No filter → hits the nearer wall.
    expect(m.raycast(0, 5, 0, 0, -5, 0)?.body).toBe(wall);
    // Mask 1 → skips the wall (group 2) and hits the target (group 1).
    expect(m.raycast(0, 5, 0, 0, -5, 0, { collisionMask: 1 })?.body).toBe(target);
    m.destroy();
  });

  it("setKinematicTarget repositions a kinematic body", () => {
    const m = new Physics3DManager({ gravity: { x: 0, y: -9.82, z: 0 }, interpolation: false });
    const kin = m.createBody({ shape: { kind: "box", width: 2, height: 2, depth: 2 }, x: 0, y: 0, z: 0, type: "kinematic" });
    m.setKinematicTarget(kin, 3, 4, 5);
    m.step(1 / 60);
    const t = m.getTransform(kin);
    expect(t.x).toBeCloseTo(3, 2);
    expect(t.y).toBeCloseTo(4, 2);
    expect(t.z).toBeCloseTo(5, 2);
    m.destroy();
  });
});

describe("Physics3DManager — onCollisionEnd", () => {
  it("does not throw when subscribing and stepping with no contacts", () => {
    const m = new Physics3DManager({ gravity: { x: 0, y: 0, z: 0 } });
    const end = vi.fn();
    m.onCollisionEnd(end);
    m.createBody({ shape: { kind: "sphere", radius: 1 }, x: 0, y: 0, z: 0 });
    expect(() => m.step(1 / 60)).not.toThrow();
    m.destroy();
  });
});
