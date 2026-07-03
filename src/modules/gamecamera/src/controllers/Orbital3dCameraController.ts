import type { Camera } from "three";
import { Vector3 } from "three";
import type { GameCameraManager } from "../utilities/GameCameraManager.js";
import { GameCameraMode } from "../constants/GameCameraMode.js";
import {
  ORBITAL_DEFAULT_DISTANCE,
  ORBITAL_DEFAULT_AZIMUTH,
  ORBITAL_DEFAULT_PITCH,
  ORBITAL_DEFAULT_MIN_DISTANCE,
  ORBITAL_DEFAULT_MAX_DISTANCE,
  ORBITAL_DEFAULT_MIN_PITCH,
  ORBITAL_DEFAULT_MAX_PITCH,
} from "../constants/GameCameraDefaults.js";
import { BaseCameraController } from "./BaseCameraController.js";

export class Orbital3dCameraController extends BaseCameraController {
  private _distance: number;
  private _azimuth: number;
  private _pitch: number;
  private _minDistance: number;
  private _maxDistance: number;
  private _minPitch: number;
  private _maxPitch: number;

  public constructor(manager: GameCameraManager) {
    super(manager, GameCameraMode.Orbital3d);
    this._distance = ORBITAL_DEFAULT_DISTANCE;
    this._azimuth = ORBITAL_DEFAULT_AZIMUTH;
    this._pitch = ORBITAL_DEFAULT_PITCH;
    this._minDistance = ORBITAL_DEFAULT_MIN_DISTANCE;
    this._maxDistance = ORBITAL_DEFAULT_MAX_DISTANCE;
    this._minPitch = ORBITAL_DEFAULT_MIN_PITCH;
    this._maxPitch = ORBITAL_DEFAULT_MAX_PITCH;
  }

  public get isOrtho(): boolean {
    return false;
  }

  public get distance(): number {
    return this._distance;
  }

  public set distance(v: number) {
    this._distance = Math.max(this._minDistance, Math.min(this._maxDistance, v));
  }

  public get azimuth(): number {
    return this._azimuth;
  }

  public set azimuth(v: number) {
    this._azimuth = v;
  }

  public get pitch(): number {
    return this._pitch;
  }

  public set pitch(v: number) {
    this._pitch = Math.max(this._minPitch, Math.min(this._maxPitch, v));
  }

  public get minDistance(): number {
    return this._minDistance;
  }

  public set minDistance(v: number) {
    this._minDistance = v;
    this.distance = this._distance;
  }

  public get maxDistance(): number {
    return this._maxDistance;
  }

  public set maxDistance(v: number) {
    this._maxDistance = v;
    this.distance = this._distance;
  }

  public get minPitch(): number {
    return this._minPitch;
  }

  public set minPitch(v: number) {
    this._minPitch = v;
    this.pitch = this._pitch;
  }

  public get maxPitch(): number {
    return this._maxPitch;
  }

  public set maxPitch(v: number) {
    this._maxPitch = v;
    this.pitch = this._pitch;
  }

  public addAzimuth(delta: number): void {
    this._azimuth += delta;
  }

  public addPitch(delta: number): void {
    this._pitch = Math.max(this._minPitch, Math.min(this._maxPitch, this._pitch + delta));
  }

  public addDistance(delta: number): void {
    this.distance = this._distance + delta;
  }

  public applyPositionToCamera(camera: Camera, focus: Vector3, _orthoSize: number): void {
    camera.rotation.set(0, 0, 0);
    camera.up.set(0, 1, 0);
    const x = focus.x + this._distance * Math.cos(this._pitch) * Math.sin(this._azimuth);
    const y = focus.y + this._distance * Math.sin(this._pitch);
    const z = focus.z + this._distance * Math.cos(this._pitch) * Math.cos(this._azimuth);
    camera.position.set(x, y, z);
    camera.lookAt(focus.x, focus.y, focus.z);
  }

  public getFocusFromOrthoPosition(orthoPos: Vector3, orthoSize: number): Vector3 {
    return new Vector3(orthoPos.x, orthoPos.y - orthoSize * 0.5, orthoPos.z);
  }

  public move(x: number, y: number, z: number): void {
    this._manager.setPosition(x, y, z);
  }
}
