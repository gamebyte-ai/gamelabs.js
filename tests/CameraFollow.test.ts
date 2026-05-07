import * as THREE from "three";
import { describe, it, expect, vi } from "vitest";
import { FollowObject } from "../src/modules/gamecamera/src/utilities/FollowObject.js";
import { FollowPosition } from "../src/modules/gamecamera/src/utilities/FollowPosition.js";
import { GameCameraManager } from "../src/modules/gamecamera/src/utilities/GameCameraManager.js";
import { Topdown2dCameraController } from "../src/modules/gamecamera/src/controllers/Topdown2dCameraController.js";
import type { ICameraFollow } from "../src/modules/gamecamera/src/utilities/ICameraFollow.js";

describe("FollowObject", () => {
  it("lerps the focal point toward the object's world position", () => {
    const obj = new THREE.Object3D();
    obj.position.set(10, 0, 0);
    obj.updateMatrixWorld();
    const follow = new FollowObject(obj, 8);

    const current = new THREE.Vector3(0, 0, 0);
    follow.step(current, 1 / 60);

    // Exponential lerp with k=8 over 1/60s yields ~12.5% of the way to target.
    expect(current.x).toBeGreaterThan(0);
    expect(current.x).toBeLessThan(10);
    expect(current.y).toBe(0);
    expect(current.z).toBe(0);
  });

  it("converges to the object's position over many ticks", () => {
    const obj = new THREE.Object3D();
    obj.position.set(5, 0, -3);
    obj.updateMatrixWorld();
    const follow = new FollowObject(obj, 8);

    const current = new THREE.Vector3(0, 0, 0);
    for (let i = 0; i < 100; i++) follow.step(current, 1 / 60);

    expect(current.x).toBeCloseTo(5, 4);
    expect(current.z).toBeCloseTo(-3, 4);
  });

  it("higher easing converges faster", () => {
    const obj = new THREE.Object3D();
    obj.position.set(10, 0, 0);
    obj.updateMatrixWorld();
    const slow = new FollowObject(obj, 4);
    const fast = new FollowObject(obj, 16);

    const slowPos = new THREE.Vector3(0, 0, 0);
    const fastPos = new THREE.Vector3(0, 0, 0);
    slow.step(slowPos, 1 / 60);
    fast.step(fastPos, 1 / 60);

    expect(fastPos.x).toBeGreaterThan(slowPos.x);
  });

  it("tracks the object's world position when it moves", () => {
    const obj = new THREE.Object3D();
    obj.position.set(0, 0, 0);
    obj.updateMatrixWorld();
    const follow = new FollowObject(obj, 8);

    const current = new THREE.Vector3(0, 0, 0);
    follow.step(current, 1 / 60); // converged at origin

    obj.position.set(20, 0, 0);
    obj.updateMatrixWorld();
    follow.step(current, 1 / 60);

    expect(current.x).toBeGreaterThan(0); // started easing toward new pos
  });
});

describe("FollowPosition", () => {
  it("lerps toward the constructor target", () => {
    const follow = new FollowPosition(10, 0, 0, 8);
    const current = new THREE.Vector3(0, 0, 0);
    follow.step(current, 1 / 60);
    expect(current.x).toBeGreaterThan(0);
    expect(current.x).toBeLessThan(10);
  });

  it("setTarget updates the destination without resetting", () => {
    const follow = new FollowPosition(10, 0, 0, 8);
    const current = new THREE.Vector3(0, 0, 0);

    for (let i = 0; i < 50; i++) follow.step(current, 1 / 60);
    expect(current.x).toBeGreaterThan(9); // mostly converged

    follow.setTarget(0, 0, 0);
    follow.step(current, 1 / 60);
    expect(current.x).toBeLessThan(9); // started easing back to origin
  });

  it("converges over many ticks", () => {
    const follow = new FollowPosition(3, 4, 5, 8);
    const current = new THREE.Vector3(0, 0, 0);
    for (let i = 0; i < 100; i++) follow.step(current, 1 / 60);
    expect(current.x).toBeCloseTo(3, 4);
    expect(current.y).toBeCloseTo(4, 4);
    expect(current.z).toBeCloseTo(5, 4);
  });
});

describe("GameCameraManager follow API", () => {
  it("setFollow stores the strategy; getFollow returns it", () => {
    const m = new GameCameraManager();
    const follow: ICameraFollow = { step: () => {} };
    m.setFollow(follow);
    expect(m.getFollow()).toBe(follow);
  });

  it("setFollow(null) clears the strategy", () => {
    const m = new GameCameraManager();
    m.setFollow({ step: () => {} });
    m.setFollow(null);
    expect(m.getFollow()).toBeNull();
  });

  it("stopFollow clears the strategy", () => {
    const m = new GameCameraManager();
    m.setFollow({ step: () => {} });
    m.stopFollow();
    expect(m.getFollow()).toBeNull();
  });

  it("setPosition clears the strategy", () => {
    const m = new GameCameraManager();
    new Topdown2dCameraController(m).register();
    m.setFollow({ step: () => {} });
    m.setPosition(0, 0, 0);
    expect(m.getFollow()).toBeNull();
  });

  it("update(dt) invokes the strategy's step with dt", () => {
    const m = new GameCameraManager();
    new Topdown2dCameraController(m).register();
    const step = vi.fn();
    m.setFollow({ step });

    // Without a world, update() returns early — the manager guards on _world.
    // Force the world reference to a stub that satisfies the world check.
    // Use a minimal cast — we don't exercise renderer paths here.
    const fakeWorld = { renderer: { getSize: () => {} }, setActiveCamera: () => {} };
    Object.assign(m, { _world: fakeWorld });

    m.update(1 / 60);
    expect(step).toHaveBeenCalledTimes(1);
    expect(step).toHaveBeenCalledWith(expect.any(THREE.Vector3), 1 / 60);
  });

  it("update(dt) skips the strategy when none is set", () => {
    const m = new GameCameraManager();
    new Topdown2dCameraController(m).register();
    const fakeWorld = { renderer: { getSize: () => {} }, setActiveCamera: () => {} };
    Object.assign(m, { _world: fakeWorld });

    // No follow set — update should not throw.
    expect(() => m.update(1 / 60)).not.toThrow();
  });
});

describe("GameCameraManager legacy follow methods (backwards compat)", () => {
  it("followObject installs a FollowObject strategy", () => {
    const m = new GameCameraManager();
    const obj = new THREE.Object3D();
    obj.position.set(5, 0, 5);
    obj.updateMatrixWorld();
    m.followObject(obj, 8);

    const follow = m.getFollow();
    expect(follow).toBeInstanceOf(FollowObject);
    expect((follow as FollowObject).object).toBe(obj);
    expect((follow as FollowObject).easing).toBe(8);
  });

  it("followPosition installs a FollowPosition strategy", () => {
    const m = new GameCameraManager();
    m.followPosition(1, 2, 3, 12);

    const follow = m.getFollow();
    expect(follow).toBeInstanceOf(FollowPosition);
    expect((follow as FollowPosition).target.toArray()).toEqual([1, 2, 3]);
    expect((follow as FollowPosition).easing).toBe(12);
  });

  it("followObject snaps the focal point to the object on first call", () => {
    const m = new GameCameraManager();
    new Topdown2dCameraController(m).register();
    const obj = new THREE.Object3D();
    obj.position.set(7, 0, -4);
    obj.updateMatrixWorld();

    m.followObject(obj);

    // After follow installed, the next _applyPositionToCamera should put
    // the camera at (7, _, -4) on the topdown XZ plane (with the topdown
    // Y offset). Trigger an apply via setOffset.
    let captured = new THREE.Vector3();
    m.setConstraint("capture", {
      applyToCamera: (pos) => {
        captured = pos.clone();
      },
    });
    m.setOffset("force", {});
    expect(captured.x).toBe(7);
    expect(captured.z).toBe(-4);
  });
});
