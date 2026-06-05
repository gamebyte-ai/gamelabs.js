import { describe, it, expect, vi } from "vitest";
import { Physics2DManager } from "../src/modules/physics2d/src/Physics2DManager.js";
import type { BodyId } from "../src/modules/physics2d/src/types.js";

/** Step the manager for `seconds` of wall-clock time in 1/60 increments. */
function advance(m: Physics2DManager, seconds: number): void {
  const dt = 1 / 60;
  for (let t = 0; t < seconds; t += dt) m.step(dt);
}

describe("Physics2DManager — lifecycle", () => {
  it("creates and removes bodies, tracking bodyCount and has()", () => {
    const m = new Physics2DManager({ gravity: { x: 0, y: 0 } });
    const a = m.createBody({ shape: { kind: "circle", radius: 10 }, x: 0, y: 0 });
    const b = m.createBody({ shape: { kind: "rect", width: 20, height: 20 }, x: 100, y: 0 });
    expect(m.bodyCount).toBe(2);
    expect(m.has(a)).toBe(true);
    m.removeBody(a);
    expect(m.has(a)).toBe(false);
    expect(m.bodyCount).toBe(1);
    expect(m.has(b)).toBe(true);
    m.destroy();
  });

  it("stores and returns a body tag", () => {
    const m = new Physics2DManager({ gravity: { x: 0, y: 0 } });
    const id = m.createBody({ shape: { kind: "circle", radius: 5 }, x: 0, y: 0, tag: "player" });
    expect(m.getTag(id)).toBe("player");
    m.destroy();
  });

  it("getTransform throws for an unknown body", () => {
    const m = new Physics2DManager();
    expect(() => m.getTransform(999 as BodyId)).toThrow();
    m.destroy();
  });
});

describe("Physics2DManager — simulation", () => {
  it("a dynamic body falls under gravity (y increases, y-down)", () => {
    const m = new Physics2DManager({ gravity: { x: 0, y: 1 }, interpolation: false });
    const id = m.createBody({ shape: { kind: "circle", radius: 10 }, x: 0, y: 0 });
    const before = m.getTransform(id).y;
    advance(m, 1);
    const after = m.getTransform(id).y;
    expect(after).toBeGreaterThan(before);
    m.destroy();
  });

  it("a static body does not move under gravity", () => {
    const m = new Physics2DManager({ gravity: { x: 0, y: 1 }, interpolation: false });
    const id = m.createBody({ shape: { kind: "rect", width: 50, height: 10 }, x: 0, y: 200, type: "static" });
    advance(m, 1);
    expect(m.getTransform(id).y).toBeCloseTo(200, 3);
    m.destroy();
  });

  it("setVelocity moves a body deterministically with gravity off", () => {
    const m = new Physics2DManager({ gravity: { x: 0, y: 0 }, interpolation: false });
    const id = m.createBody({ shape: { kind: "circle", radius: 5 }, x: 0, y: 0, frictionAir: 0 });
    m.setVelocity(id, 60, 0); // 60 px/s
    advance(m, 1);
    expect(m.getTransform(id).x).toBeGreaterThan(40);
    m.destroy();
  });

  it("runs zero substeps (no movement) when dt is below the fixed step", () => {
    const m = new Physics2DManager({ gravity: { x: 0, y: 1 }, interpolation: false });
    const id = m.createBody({ shape: { kind: "circle", radius: 5 }, x: 0, y: 0 });
    m.step(1 / 240); // quarter step, no integration yet
    expect(m.getTransform(id).y).toBeCloseTo(0, 6);
    m.destroy();
  });
});

describe("Physics2DManager — collisions", () => {
  it("fires collisionStart for two overlapping bodies with mapped ids", () => {
    const m = new Physics2DManager({ gravity: { x: 0, y: 0 } });
    const a = m.createBody({ shape: { kind: "circle", radius: 20 }, x: 0, y: 0 });
    const b = m.createBody({ shape: { kind: "circle", radius: 20 }, x: 10, y: 0 });
    const seen: Array<[BodyId, BodyId]> = [];
    m.onCollisionStart((x, y) => seen.push([x, y]));
    m.step(1 / 60);
    expect(seen.length).toBeGreaterThanOrEqual(1);
    const pair = seen[0];
    expect(new Set(pair)).toEqual(new Set([a, b]));
    m.destroy();
  });

  it("a sensor reports collisions but produces no physical push", () => {
    const m = new Physics2DManager({ gravity: { x: 0, y: 0 }, interpolation: false });
    const sensor = m.createBody({ shape: { kind: "rect", width: 40, height: 40 }, x: 0, y: 0, isSensor: true, type: "static" });
    const ball = m.createBody({ shape: { kind: "circle", radius: 10 }, x: 0, y: 0 });
    const start = vi.fn();
    m.onCollisionStart(start);
    m.step(1 / 60);
    expect(start).toHaveBeenCalled();
    // No physical response: the ball stays at the sensor's center.
    expect(m.getTransform(ball).x).toBeCloseTo(0, 2);
    expect(m.getTransform(ball).y).toBeCloseTo(0, 2);
    expect(sensor).toBeDefined();
    m.destroy();
  });

  it("removeBody() inside a collision callback is safe", () => {
    const m = new Physics2DManager({ gravity: { x: 0, y: 0 } });
    const a = m.createBody({ shape: { kind: "circle", radius: 20 }, x: 0, y: 0 });
    const b = m.createBody({ shape: { kind: "circle", radius: 20 }, x: 10, y: 0 });
    m.onCollisionStart((x) => m.removeBody(x));
    expect(() => m.step(1 / 60)).not.toThrow();
    // One of the two bodies was removed during the callback.
    expect(m.bodyCount).toBe(1);
    expect(a === b).toBe(false);
    m.destroy();
  });
});

describe("Physics2DManager — queries", () => {
  it("queryPoint finds a body under the point", () => {
    const m = new Physics2DManager({ gravity: { x: 0, y: 0 } });
    const id = m.createBody({ shape: { kind: "circle", radius: 30 }, x: 100, y: 100 });
    expect(m.queryPoint(100, 100)).toContain(id);
    expect(m.queryPoint(500, 500)).not.toContain(id);
    m.destroy();
  });

  it("queryAABB finds bodies in a region", () => {
    const m = new Physics2DManager({ gravity: { x: 0, y: 0 } });
    const inside = m.createBody({ shape: { kind: "circle", radius: 5 }, x: 50, y: 50 });
    const outside = m.createBody({ shape: { kind: "circle", radius: 5 }, x: 500, y: 500 });
    const hits = m.queryAABB(0, 0, 100, 100);
    expect(hits).toContain(inside);
    expect(hits).not.toContain(outside);
    m.destroy();
  });
});

describe("Physics2DManager — kinematic", () => {
  it("setKinematicTarget repositions a kinematic body; ignored for dynamic", () => {
    const m = new Physics2DManager({ gravity: { x: 0, y: 0 }, interpolation: false });
    const kin = m.createBody({ shape: { kind: "rect", width: 40, height: 10 }, x: 0, y: 0, type: "kinematic" });
    const dyn = m.createBody({ shape: { kind: "circle", radius: 5 }, x: 0, y: 0, type: "dynamic" });

    m.setKinematicTarget(kin, 100, 50);
    m.step(1 / 60);
    expect(m.getTransform(kin).x).toBeCloseTo(100, 3);
    expect(m.getTransform(kin).y).toBeCloseTo(50, 3);

    m.setKinematicTarget(dyn, 999, 999); // no-op for dynamic
    expect(m.getTransform(dyn).x).not.toBeCloseTo(999, 1);
    m.destroy();
  });
});
