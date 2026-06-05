import { describe, it, expect, vi } from "vitest";
import { FakePhysics2D } from "../src/modules/physics2d/src/FakePhysics2D.js";
import { Physics2DStage, type Physics2DEntityView } from "../src/modules/physics2d/src/Physics2DStage.js";
import { FakePhysics3D } from "../src/modules/physics3d/src/FakePhysics3D.js";
import { Physics3DStage, type Physics3DEntityView } from "../src/modules/physics3d/src/Physics3DStage.js";

function fakeView2D() {
  return {
    transforms: [] as Array<[number, number, number]>,
    disposed: 0,
    setTransform(x: number, y: number, angle: number) {
      this.transforms.push([x, y, angle]);
    },
    dispose() {
      this.disposed++;
    },
  } satisfies Physics2DEntityView & { transforms: Array<[number, number, number]>; disposed: number };
}

describe("Physics2DStage", () => {
  it("spawn creates a body and returns a handle with its id", () => {
    const world = new FakePhysics2D({ gravity: { x: 0, y: 0 } });
    const stage = new Physics2DStage(world);
    const e = stage.spawn({ shape: { kind: "circle", radius: 5 }, x: 1, y: 2 }, fakeView2D());
    expect(world.has(e.id)).toBe(true);
    expect(stage.size).toBe(1);
    expect(stage.has(e.id)).toBe(true);
  });

  it("sync pushes the body transform onto the view", () => {
    const world = new FakePhysics2D({ gravity: { x: 0, y: 0 } });
    const stage = new Physics2DStage(world);
    const view = fakeView2D();
    stage.spawn({ shape: { kind: "rect", width: 4, height: 4 }, x: 7, y: 9, angle: 0.5 }, view);
    stage.sync();
    expect(view.transforms.at(-1)).toEqual([7, 9, 0.5]);
  });

  it("despawn removes the body and disposes the view (idempotent)", () => {
    const world = new FakePhysics2D({ gravity: { x: 0, y: 0 } });
    const stage = new Physics2DStage(world);
    const view = fakeView2D();
    const e = stage.spawn({ shape: { kind: "circle", radius: 5 }, x: 0, y: 0 }, view);
    e.despawn();
    expect(world.has(e.id)).toBe(false);
    expect(view.disposed).toBe(1);
    expect(stage.size).toBe(0);
    e.despawn(); // no-op second time
    expect(view.disposed).toBe(1);
  });

  it("sync disposes the view of a body removed out-of-band", () => {
    const world = new FakePhysics2D({ gravity: { x: 0, y: 0 } });
    const stage = new Physics2DStage(world);
    const view = fakeView2D();
    const e = stage.spawn({ shape: { kind: "circle", radius: 5 }, x: 0, y: 0 }, view);
    world.removeBody(e.id); // removed directly, not via the stage
    stage.sync();
    expect(view.disposed).toBe(1);
    expect(stage.size).toBe(0);
  });

  it("clear despawns everything", () => {
    const world = new FakePhysics2D({ gravity: { x: 0, y: 0 } });
    const stage = new Physics2DStage(world);
    const a = fakeView2D();
    const b = fakeView2D();
    stage.spawn({ shape: { kind: "circle", radius: 5 }, x: 0, y: 0 }, a);
    stage.spawn({ shape: { kind: "circle", radius: 5 }, x: 0, y: 0 }, b);
    stage.clear();
    expect(stage.size).toBe(0);
    expect(a.disposed).toBe(1);
    expect(b.disposed).toBe(1);
    expect(world.bodyCount).toBe(0);
  });

  it("a spawned dynamic body falls and the view tracks it", () => {
    const world = new FakePhysics2D({ gravity: { x: 0, y: 100 } });
    const stage = new Physics2DStage(world);
    const view = fakeView2D();
    stage.spawn({ shape: { kind: "circle", radius: 5 }, x: 0, y: 0 }, view);
    for (let i = 0; i < 30; i++) {
      world.step(1 / 60);
      stage.sync();
    }
    expect(view.transforms.at(-1)![1]).toBeGreaterThan(0); // y increased
  });
});

describe("Physics3DStage", () => {
  function fakeView3D() {
    return {
      last: null as null | { x: number; y: number; z: number },
      disposed: 0,
      setTransform(t: { x: number; y: number; z: number }) {
        this.last = { x: t.x, y: t.y, z: t.z };
      },
      dispose() {
        this.disposed++;
      },
    } satisfies Physics3DEntityView & { last: null | { x: number; y: number; z: number }; disposed: number };
  }

  it("spawn + sync + despawn round-trip", () => {
    const world = new FakePhysics3D({ gravity: { x: 0, y: 0, z: 0 } });
    const stage = new Physics3DStage(world);
    const view = fakeView3D();
    const e = stage.spawn({ shape: { kind: "sphere", radius: 1 }, x: 3, y: 4, z: 5 }, view);
    stage.sync();
    expect(view.last).toEqual({ x: 3, y: 4, z: 5 });
    e.despawn();
    expect(world.has(e.id)).toBe(false);
    expect(view.disposed).toBe(1);
  });

  it("clear disposes all views", () => {
    const world = new FakePhysics3D({ gravity: { x: 0, y: 0, z: 0 } });
    const stage = new Physics3DStage(world);
    const view = fakeView3D();
    stage.spawn({ shape: { kind: "box", width: 1, height: 1, depth: 1 }, x: 0, y: 0, z: 0 }, view);
    stage.clear();
    expect(view.disposed).toBe(1);
    expect(stage.size).toBe(0);
  });

  it("does not throw and tracks nothing extra when synced empty", () => {
    const world = new FakePhysics3D();
    const stage = new Physics3DStage(world);
    const spy = vi.fn();
    expect(() => stage.sync()).not.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });
});
