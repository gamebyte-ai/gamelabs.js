import { describe, it, expect, vi } from "vitest";
import { FakePhysics2D } from "../src/modules/physics2d/src/FakePhysics2D.js";
import { Physics2DSyncBag } from "../src/modules/physics2d/src/Physics2DSyncBag.js";
import { FakePhysics3D } from "../src/modules/physics3d/src/FakePhysics3D.js";
import { Physics3DSyncBag } from "../src/modules/physics3d/src/Physics3DSyncBag.js";

describe("FakePhysics2D", () => {
  it("integrates gravity deterministically (½gt²-ish)", () => {
    const fake = new FakePhysics2D({ gravity: { x: 0, y: 100 } });
    const id = fake.createBody({ shape: { kind: "circle", radius: 1 }, x: 0, y: 0 });
    for (let i = 0; i < 60; i++) fake.step(1 / 60); // 1 second
    // Semi-implicit Euler overshoots ½gt²=50 slightly; assert it fell ~that far.
    const y = fake.getTransform(id).y;
    expect(y).toBeGreaterThan(45);
    expect(y).toBeLessThan(60);
    expect(fake.stepsRun).toBe(60);
  });

  it("static and kinematic bodies don't fall; setKinematicTarget repositions", () => {
    const fake = new FakePhysics2D({ gravity: { x: 0, y: 100 } });
    const stat = fake.createBody({ shape: { kind: "rect", width: 1, height: 1 }, x: 0, y: 10, type: "static" });
    const kin = fake.createBody({ shape: { kind: "rect", width: 1, height: 1 }, x: 0, y: 0, type: "kinematic" });
    for (let i = 0; i < 60; i++) fake.step(1 / 60);
    // Neither is integrated by gravity.
    expect(fake.getTransform(stat).y).toBe(10);
    expect(fake.getTransform(kin).y).toBe(0);
    // Kinematic is positioned explicitly.
    fake.setKinematicTarget(kin, 25, 5);
    fake.step(1 / 60);
    expect(fake.getTransform(kin).x).toBe(25);
    expect(fake.getTransform(kin).y).toBe(5);
  });

  it("drives collision events via test hooks", () => {
    const fake = new FakePhysics2D();
    const a = fake.createBody({ shape: { kind: "circle", radius: 1 }, x: 0, y: 0, tag: "player" });
    const b = fake.createBody({ shape: { kind: "circle", radius: 1 }, x: 1, y: 0, tag: "enemy" });
    const start = vi.fn();
    const end = vi.fn();
    fake.onCollisionStart(start);
    fake.onCollisionEnd(end);
    fake.emitCollisionStart(a, b, { x: 0.5, y: 0, normalX: 1, normalY: 0 });
    fake.emitCollisionEnd(a, b);
    expect(start).toHaveBeenCalledWith(a, b, { x: 0.5, y: 0, normalX: 1, normalY: 0 });
    expect(end).toHaveBeenCalledWith(a, b);
    expect(fake.getTag(a)).toBe("player");
  });
});

describe("Physics2DSyncBag", () => {
  it("pushes each bound body's transform to its sink on sync()", () => {
    const fake = new FakePhysics2D({ gravity: { x: 0, y: 0 } });
    const id = fake.createBody({ shape: { kind: "circle", radius: 1 }, x: 7, y: 9, angle: 1.5 });
    const bag = new Physics2DSyncBag(fake);
    const sink = vi.fn();
    bag.bind(id, sink);
    bag.sync();
    expect(sink).toHaveBeenCalledWith(7, 9, 1.5);
    expect(bag.size).toBe(1);
  });

  it("auto-drops a binding whose body was removed", () => {
    const fake = new FakePhysics2D({ gravity: { x: 0, y: 0 } });
    const id = fake.createBody({ shape: { kind: "circle", radius: 1 }, x: 0, y: 0 });
    const bag = new Physics2DSyncBag(fake);
    const sink = vi.fn();
    bag.bind(id, sink);
    fake.removeBody(id);
    bag.sync();
    expect(sink).not.toHaveBeenCalled();
    expect(bag.size).toBe(0);
  });

  it("unbind() and flush() stop pushing", () => {
    const fake = new FakePhysics2D({ gravity: { x: 0, y: 0 } });
    const a = fake.createBody({ shape: { kind: "circle", radius: 1 }, x: 0, y: 0 });
    const b = fake.createBody({ shape: { kind: "circle", radius: 1 }, x: 0, y: 0 });
    const bag = new Physics2DSyncBag(fake);
    const sa = vi.fn();
    const sb = vi.fn();
    const unbindA = bag.bind(a, sa);
    bag.bind(b, sb);
    unbindA();
    bag.sync();
    expect(sa).not.toHaveBeenCalled();
    expect(sb).toHaveBeenCalledTimes(1);
    bag.flush();
    expect(bag.size).toBe(0);
  });
});

describe("FakePhysics3D + Physics3DSyncBag", () => {
  it("integrates gravity on the y axis", () => {
    const fake = new FakePhysics3D({ gravity: { x: 0, y: -10, z: 0 } });
    const id = fake.createBody({ shape: { kind: "sphere", radius: 1 }, x: 0, y: 0, z: 0 });
    for (let i = 0; i < 60; i++) fake.step(1 / 60);
    expect(fake.getTransform(id).y).toBeLessThan(0);
  });

  it("sync bag pushes the full transform and drops stale bindings", () => {
    const fake = new FakePhysics3D({ gravity: { x: 0, y: 0, z: 0 } });
    const id = fake.createBody({
      shape: { kind: "sphere", radius: 1 },
      x: 1,
      y: 2,
      z: 3,
      rotation: { x: 0, y: 0, z: 0, w: 1 },
    });
    const bag = new Physics3DSyncBag(fake);
    const sink = vi.fn();
    bag.bind(id, sink);
    bag.sync();
    expect(sink).toHaveBeenCalledWith({ x: 1, y: 2, z: 3, qx: 0, qy: 0, qz: 0, qw: 1 });

    fake.removeBody(id);
    bag.sync();
    expect(bag.size).toBe(0);
  });
});
