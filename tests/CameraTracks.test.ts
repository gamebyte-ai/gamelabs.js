import * as THREE from "three";
import { describe, it, expect } from "vitest";
import { GameCameraManager } from "../src/modules/gamecamera/src/utilities/GameCameraManager.js";
import { Topdown2dCameraController } from "../src/modules/gamecamera/src/controllers/Topdown2dCameraController.js";
import { Front3dCameraController } from "../src/modules/gamecamera/src/controllers/Front3dCameraController.js";
import { ZoomPunchTrack } from "../src/modules/gamecamera/src/utilities/ZoomPunchTrack.js";
import { DollyZoomTrack } from "../src/modules/gamecamera/src/utilities/DollyZoomTrack.js";
import { HitStopTrack } from "../src/modules/gamecamera/src/utilities/HitStopTrack.js";
import { CinematicPathTrack } from "../src/modules/gamecamera/src/utilities/CinematicPathTrack.js";
import { PathFollow } from "../src/modules/gamecamera/src/utilities/PathFollow.js";
import { FollowObject } from "../src/modules/gamecamera/src/utilities/FollowObject.js";
import { TimelineModel } from "../src/modules/timeline/src/models/TimelineModel.js";
import { TimelineEvents } from "../src/modules/timeline/src/events/TimelineEvents.js";
import { TimelineManager } from "../src/modules/timeline/src/utilities/TimelineManager.js";

function makeRig(): { camera: GameCameraManager; timeline: TimelineManager } {
  const camera = new GameCameraManager();
  const timeline = new TimelineManager(new TimelineModel(), new TimelineEvents());
  return { camera, timeline };
}

describe("ZoomPunchTrack", () => {
  it("writes a fov offset that follows sin(π·progress)", () => {
    const { camera, timeline } = makeRig();
    const track = timeline.add(new ZoomPunchTrack(camera, { duration: 1, fovDelta: 10 }));

    timeline.update(0.5); // progress=0.5 → sin(π/2)=1 → peak
    expect(track.state).toBe("active");
    const peak = camera.getOffset(`camera-zoom-punch:${track.uniqueId}`);
    expect(peak?.fov).toBeCloseTo(10, 5);

    timeline.update(0.5); // ends
    expect(track.state).toBe("ended");
    expect(camera.getOffset(`camera-zoom-punch:${track.uniqueId}`)).toBeNull();
  });

  it("writes orthoSize offset when configured for ortho cameras", () => {
    const { camera, timeline } = makeRig();
    const track = timeline.add(new ZoomPunchTrack(camera, { duration: 1, orthoSizeDelta: -2 }));
    timeline.update(0.5);
    const peak = camera.getOffset(`camera-zoom-punch:${track.uniqueId}`);
    expect(peak?.orthoSize).toBeCloseTo(-2, 5);
    expect(peak?.fov).toBeUndefined();
  });

  it("clears the offset on cancel", () => {
    const { camera, timeline } = makeRig();
    const track = timeline.add(new ZoomPunchTrack(camera, { duration: 1, fovDelta: 5 }));
    timeline.update(0.2);
    timeline.cancel(track.uniqueId);
    expect(camera.getOffset(`camera-zoom-punch:${track.uniqueId}`)).toBeNull();
  });
});

describe("DollyZoomTrack", () => {
  it("writes fov + worldPosition offsets such that D · tan(F/2) is preserved", () => {
    const { camera, timeline } = makeRig();
    new Front3dCameraController(camera).register();
    const cam = camera.getCamera() as THREE.PerspectiveCamera;
    cam.fov = 60;
    cam.position.set(0, 0, 10); // 10 units from a target at origin
    cam.updateMatrixWorld();

    const target = new THREE.Vector3(0, 0, 0);
    const track = timeline.add(new DollyZoomTrack(camera, { duration: 1, target, fovDelta: 30 }));

    // Halfway: linear curve so fov delta = 15.
    timeline.update(0.5);
    const offset = camera.getOffset(`camera-dolly-zoom:${track.uniqueId}`);
    expect(offset?.fov).toBeCloseTo(15, 5);

    // Compensation invariant: (D0 + posOffsetAlongForward) * tan((F0 + fovDelta)/2) ≈ D0 * tan(F0/2)
    const F0 = THREE.MathUtils.degToRad(60);
    const F1 = THREE.MathUtils.degToRad(75);
    const D0 = 10;
    const tanRatio = Math.tan(F0 / 2) / Math.tan(F1 / 2);
    const expectedDistanceDelta = D0 * tanRatio - D0; // signed; negative means dolly forward, positive = back
    // forward from camera (0,0,10) to target (0,0,0) is (0,0,-1). offset = -forward * delta = (0,0,delta).
    expect(offset?.worldPosition?.z).toBeCloseTo(expectedDistanceDelta, 4);
  });

  it("no-ops on an ortho camera", () => {
    const { camera, timeline } = makeRig();
    new Topdown2dCameraController(camera).register();
    const target = new THREE.Vector3(0, 0, 0);
    const track = timeline.add(new DollyZoomTrack(camera, { duration: 1, target, fovDelta: 30 }));
    timeline.update(0.5);
    expect(camera.getOffset(`camera-dolly-zoom:${track.uniqueId}`)).toBeNull();
  });

  it("clears the offset on natural end", () => {
    const { camera, timeline } = makeRig();
    new Front3dCameraController(camera).register();
    const cam = camera.getCamera() as THREE.PerspectiveCamera;
    cam.position.set(0, 0, 10);
    cam.updateMatrixWorld();
    const track = timeline.add(new DollyZoomTrack(camera, { duration: 0.1, target: new THREE.Vector3(), fovDelta: 10 }));
    timeline.update(0.2);
    expect(track.state).toBe("ended");
    expect(camera.getOffset(`camera-dolly-zoom:${track.uniqueId}`)).toBeNull();
  });
});

describe("HitStopTrack", () => {
  it("clears follow on start and restores it on end", () => {
    const { camera, timeline } = makeRig();
    const obj = new THREE.Object3D();
    const original = new FollowObject(obj, 8);
    camera.setFollow(original);

    const track = timeline.add(new HitStopTrack(camera, { duration: 0.1 }));
    timeline.update(0.05); // active
    expect(camera.getFollow()).toBeNull();

    timeline.update(0.1); // ends
    expect(track.state).toBe("ended");
    expect(camera.getFollow()).toBe(original);
  });

  it("restores follow on cancel", () => {
    const { camera, timeline } = makeRig();
    const obj = new THREE.Object3D();
    const original = new FollowObject(obj, 8);
    camera.setFollow(original);

    const track = timeline.add(new HitStopTrack(camera, { duration: 0.1 }));
    timeline.update(0.05);
    timeline.cancel(track.uniqueId);
    expect(camera.getFollow()).toBe(original);
  });

  it("writes a sin-curve fov offset when fovDelta is provided", () => {
    const { camera, timeline } = makeRig();
    const track = timeline.add(new HitStopTrack(camera, { duration: 0.2, fovDelta: -5 }));
    timeline.update(0.1); // peak
    const offset = camera.getOffset(`camera-hit-stop:${track.uniqueId}`);
    expect(offset?.fov).toBeCloseTo(-5, 5);
  });

  it("skips offset writes when no pulse is configured", () => {
    const { camera, timeline } = makeRig();
    const track = timeline.add(new HitStopTrack(camera, { duration: 0.1 }));
    timeline.update(0.05);
    expect(camera.getOffset(`camera-hit-stop:${track.uniqueId}`)).toBeNull();
  });
});

describe("PathFollow", () => {
  it("interpolates linearly between two waypoints over the duration", () => {
    const wps = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0, 0)];
    const follow = new PathFollow(wps, 1);
    const cur = new THREE.Vector3();
    follow.step(cur, 0.5);
    expect(cur.x).toBeCloseTo(5, 5);
  });

  it("traverses N segments with equal time per segment", () => {
    const wps = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0, 0), new THREE.Vector3(10, 0, 10)];
    const follow = new PathFollow(wps, 2);
    const cur = new THREE.Vector3();
    follow.step(cur, 1.5); // 75% through total → 1.5 of 2 segments → midway through segment 1
    expect(cur.x).toBeCloseTo(10, 5);
    expect(cur.z).toBeCloseTo(5, 5);
  });

  it("holds at the final waypoint past duration", () => {
    const wps = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0, 0)];
    const follow = new PathFollow(wps, 1);
    const cur = new THREE.Vector3();
    follow.step(cur, 5); // way past
    expect(cur.x).toBeCloseTo(10, 5);
    follow.step(cur, 5);
    expect(cur.x).toBeCloseTo(10, 5);
  });

  it("snaps to the single waypoint when only one is provided", () => {
    const wps = [new THREE.Vector3(7, 8, 9)];
    const follow = new PathFollow(wps, 1);
    const cur = new THREE.Vector3();
    follow.step(cur, 0.1);
    expect(cur.toArray()).toEqual([7, 8, 9]);
  });
});

describe("CinematicPathTrack", () => {
  it("installs a PathFollow on start and restores the previous follow on end", () => {
    const { camera, timeline } = makeRig();
    const obj = new THREE.Object3D();
    const original = new FollowObject(obj, 8);
    camera.setFollow(original);

    const wps = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0, 0)];
    const track = timeline.add(new CinematicPathTrack(camera, { duration: 0.1, waypoints: wps }));
    timeline.update(0.05);
    expect(camera.getFollow()).toBeInstanceOf(PathFollow);

    timeline.update(0.1);
    expect(track.state).toBe("ended");
    expect(camera.getFollow()).toBe(original);
  });

  it("restores the previous follow on cancel", () => {
    const { camera, timeline } = makeRig();
    camera.setFollow(null);

    const track = timeline.add(
      new CinematicPathTrack(camera, {
        duration: 1,
        waypoints: [new THREE.Vector3(), new THREE.Vector3(1, 0, 0)],
      }),
    );
    timeline.update(0.1);
    expect(camera.getFollow()).toBeInstanceOf(PathFollow);
    timeline.cancel(track.uniqueId);
    expect(camera.getFollow()).toBeNull();
  });
});
