import * as THREE from "three";
import { describe, it, expect, vi } from "vitest";
import { BoundsConstraint } from "../src/modules/gamecamera/src/utilities/BoundsConstraint.js";
import { DeadZoneFocusConstraint } from "../src/modules/gamecamera/src/utilities/DeadZoneFocusConstraint.js";
import { GameCameraManager } from "../src/modules/gamecamera/src/utilities/GameCameraManager.js";
import { Topdown2dCameraController } from "../src/modules/gamecamera/src/controllers/Topdown2dCameraController.js";
import type { ICameraConstraint } from "../src/modules/gamecamera/src/utilities/ICameraConstraint.js";

describe("BoundsConstraint", () => {
  it("clamps a position past max back to the max edge", () => {
    const c = new BoundsConstraint({
      min: new THREE.Vector3(-10, 0, -10),
      max: new THREE.Vector3(10, 100, 10),
    });
    const p = new THREE.Vector3(15, 50, 5);
    c.applyToCamera(p, new THREE.Euler());
    expect(p.x).toBe(10);
    expect(p.y).toBe(50);
    expect(p.z).toBe(5);
  });

  it("clamps a position past min back to the min edge on every axis", () => {
    const c = new BoundsConstraint({
      min: new THREE.Vector3(-1, -2, -3),
      max: new THREE.Vector3(1, 2, 3),
    });
    const p = new THREE.Vector3(-5, -10, -10);
    c.applyToCamera(p, new THREE.Euler());
    expect(p.x).toBe(-1);
    expect(p.y).toBe(-2);
    expect(p.z).toBe(-3);
  });

  it("leaves an in-bounds position untouched", () => {
    const c = new BoundsConstraint({
      min: new THREE.Vector3(-10, -10, -10),
      max: new THREE.Vector3(10, 10, 10),
    });
    const p = new THREE.Vector3(2, 3, -4);
    c.applyToCamera(p, new THREE.Euler());
    expect(p.toArray()).toEqual([2, 3, -4]);
  });

  it("setMin / setMax update the bounds", () => {
    const c = new BoundsConstraint({
      min: new THREE.Vector3(-10, -10, -10),
      max: new THREE.Vector3(10, 10, 10),
    });
    c.setMin(new THREE.Vector3(0, 0, 0));
    c.setMax(new THREE.Vector3(5, 5, 5));
    const p = new THREE.Vector3(-1, -1, -1);
    c.applyToCamera(p, new THREE.Euler());
    expect(p.toArray()).toEqual([0, 0, 0]);
  });
});

describe("DeadZoneFocusConstraint", () => {
  it("seeds on the first call without snapping", () => {
    const c = new DeadZoneFocusConstraint({ halfWidth: 2, halfHeight: 2 });
    const focus = new THREE.Vector3(10, 0, 10);
    c.applyToFocus(focus);
    expect(focus.toArray()).toEqual([10, 0, 10]);
  });

  it("holds focus still while subsequent inputs stay inside the window (xz plane)", () => {
    const c = new DeadZoneFocusConstraint({ plane: "xz", halfWidth: 2, halfHeight: 2 });
    c.applyToFocus(new THREE.Vector3(0, 0, 0));

    const inside = new THREE.Vector3(1.5, 0, -1.5);
    c.applyToFocus(inside);
    expect(inside.toArray()).toEqual([0, 0, 0]);
  });

  it("snaps focus so the input is back on the window edge when leaving (xz plane)", () => {
    const c = new DeadZoneFocusConstraint({ plane: "xz", halfWidth: 2, halfHeight: 2 });
    c.applyToFocus(new THREE.Vector3(0, 0, 0));

    const outside = new THREE.Vector3(5, 0, 0);
    c.applyToFocus(outside);
    // Input X (5) was 5 units past the focus center; the window's halfWidth is 2,
    // so the focus snaps to (5 - 2) = 3 on the X axis. Z stayed inside, so Z stays at 0.
    expect(outside.toArray()).toEqual([3, 0, 0]);
  });

  it("tracks the off-plane axis freely", () => {
    const c = new DeadZoneFocusConstraint({ plane: "xz", halfWidth: 2, halfHeight: 2 });
    c.applyToFocus(new THREE.Vector3(0, 0, 0));

    // Big Y move while staying inside the XZ window — focus follows Y.
    const upHigh = new THREE.Vector3(1, 50, 1);
    c.applyToFocus(upHigh);
    expect(upHigh.x).toBe(0);
    expect(upHigh.y).toBe(50);
    expect(upHigh.z).toBe(0);
  });

  it("respects the xy plane option (front2d convention)", () => {
    const c = new DeadZoneFocusConstraint({ plane: "xy", halfWidth: 2, halfHeight: 2 });
    c.applyToFocus(new THREE.Vector3(0, 0, 0));

    // Y becomes the windowed axis; Z is the off-plane axis and follows freely.
    const out = new THREE.Vector3(1, 5, 99);
    c.applyToFocus(out);
    expect(out.x).toBe(0);
    expect(out.y).toBe(3); // 5 - halfHeight(2)
    expect(out.z).toBe(99);
  });
});

describe("GameCameraManager constraint API", () => {
  it("setConstraint stores under the given id", () => {
    const m = new GameCameraManager();
    const c: ICameraConstraint = {};
    m.setConstraint("test", c);
    expect(m.getConstraint("test")).toBe(c);
  });

  it("clearConstraint removes the entry; getConstraint returns null", () => {
    const m = new GameCameraManager();
    m.setConstraint("test", {});
    m.clearConstraint("test");
    expect(m.getConstraint("test")).toBeNull();
  });

  it("clearAllConstraints empties the registry", () => {
    const m = new GameCameraManager();
    m.setConstraint("a", {});
    m.setConstraint("b", {});
    m.clearAllConstraints();
    expect(m.getConstraint("a")).toBeNull();
    expect(m.getConstraint("b")).toBeNull();
  });

  it("getConstraint returns null for an unknown id", () => {
    const m = new GameCameraManager();
    expect(m.getConstraint("nope")).toBeNull();
  });

  it("calls applyToFocus and applyToCamera each time _applyPositionToCamera runs (via setOffset)", () => {
    const m = new GameCameraManager();
    new Topdown2dCameraController(m).register();
    const applyToFocus = vi.fn();
    const applyToCamera = vi.fn();
    m.setConstraint("spy", { applyToFocus, applyToCamera });

    const focusBeforeOffset = applyToFocus.mock.calls.length;
    const cameraBeforeOffset = applyToCamera.mock.calls.length;

    m.setOffset("o", { localPosition: new THREE.Vector3(1, 0, 0) });

    expect(applyToFocus.mock.calls.length).toBeGreaterThan(focusBeforeOffset);
    expect(applyToCamera.mock.calls.length).toBeGreaterThan(cameraBeforeOffset);
  });

  it("applyToFocus runs before the controller positions the camera (focus changes propagate to camera position)", () => {
    const m = new GameCameraManager();
    new Topdown2dCameraController(m).register();
    m.setPosition(0, 0, 0);

    // Constraint shifts the focal point by +5 on X — camera should land at x=5.
    m.setConstraint("shift", {
      applyToFocus: (focus) => {
        focus.x += 5;
      },
    });

    // Trigger an apply via setOffset (which calls _applyPositionToCamera).
    m.setOffset("force", {});

    // Topdown camera lands at (focus.x, focus.y + TOPDOWN_OFFSET, focus.z).
    // x=5 confirms the focus shift propagated through the controller.
    const cam = m.getOffset; // (just to silence unused; we're checking via the camera)
    void cam;
    // Pull the camera out via the controller's last position:
    // The manager doesn't expose camera directly, so re-trigger and check the
    // shift took effect by adding an applyToCamera spy that captures position.
    let captured = new THREE.Vector3();
    m.setConstraint("capture", {
      applyToCamera: (pos) => {
        captured = pos.clone();
      },
    });
    m.setOffset("force", {});
    expect(captured.x).toBe(5);
  });

  it("constraints run in registration order (later constraints see earlier output)", () => {
    const m = new GameCameraManager();
    new Topdown2dCameraController(m).register();

    const order: string[] = [];
    m.setConstraint("first", {
      applyToFocus: () => {
        order.push("first");
      },
    });
    m.setConstraint("second", {
      applyToFocus: () => {
        order.push("second");
      },
    });

    order.length = 0;
    m.setOffset("force", {});
    expect(order).toEqual(["first", "second"]);
  });
});
