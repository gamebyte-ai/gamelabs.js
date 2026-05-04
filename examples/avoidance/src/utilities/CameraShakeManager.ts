import * as THREE from "three";
import {
  GameCameraManager,
  UpdateManager,
  type IInstanceResolver,
  type Unsubscribe,
} from "@gamebyte/gamelabsjs";

const SHAKE_OFFSET_ID = "shake";

export class CameraShakeManager {
  private _camera: GameCameraManager | null = null;
  private _amplitude = 0;
  private _durationMs = 0;
  private _remainingMs = 0;
  private _offsetVec = new THREE.Vector3();
  private _updateUnsub: Unsubscribe | null = null;

  public inject(resolver: IInstanceResolver): void {
    this._camera = resolver.getInstance(GameCameraManager);
    const updateManager = resolver.getInstance(UpdateManager);
    this._updateUnsub = updateManager.register((dt) => this._tick(dt));
  }

  public shake(amplitude: number, durationMs: number): void {
    if (this._remainingMs > 0 && amplitude < this._amplitude) return;
    this._amplitude = amplitude;
    this._durationMs = durationMs;
    this._remainingMs = durationMs;
  }

  public destroy(): void {
    this._updateUnsub?.();
    this._updateUnsub = null;
    this._camera?.clearOffset(SHAKE_OFFSET_ID);
    this._camera = null;
  }

  private _tick(dt: number): void {
    if (this._remainingMs <= 0 || !this._camera) return;
    this._remainingMs -= dt * 1000;
    if (this._remainingMs <= 0) {
      this._remainingMs = 0;
      this._camera.clearOffset(SHAKE_OFFSET_ID);
      return;
    }
    const t = this._remainingMs / this._durationMs;
    const a = this._amplitude * t;
    this._offsetVec.set((Math.random() * 2 - 1) * a, (Math.random() * 2 - 1) * a, 0);
    this._camera.setOffset(SHAKE_OFFSET_ID, { localPosition: this._offsetVec });
  }
}
