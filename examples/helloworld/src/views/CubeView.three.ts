import * as THREE from "three";
import { WorldViewBase, LogTypes, Orbital3dCameraController, POINTER_INPUT_LAYER, type IPointerInputHandler } from "gamelabsjs";
import type { IInstanceResolver } from "gamelabsjs";
import type { ICubeView } from "./ICubeView";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { HelloWorldAssetIds } from "../HelloWorldAssetIds";

export class CubeView extends WorldViewBase implements ICubeView, IPointerInputHandler {
  private _model: THREE.Object3D | null = null;
  private _orbitalController: Orbital3dCameraController | null = null;
  private _orbitalDragState = { isDragging: false, lastX: 0, lastY: 0 };

  public inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._orbitalController = resolver.getInstance(Orbital3dCameraController);
  }

  public onPointerDown(event: PointerEvent, _onThisObject: boolean): void {
    if (event.button !== 0) return;
    this._orbitalDragState.isDragging = true;
    this._orbitalDragState.lastX = event.clientX;
    this._orbitalDragState.lastY = event.clientY;
    (event.currentTarget as HTMLCanvasElement).setPointerCapture(event.pointerId);
  }

  public onPointerMove(event: PointerEvent, _onThisObject: boolean): void {
    if (!this._orbitalDragState.isDragging || !this._orbitalController) return;
    const dx = (event.clientX - this._orbitalDragState.lastX) * 0.005;
    const dy = (event.clientY - this._orbitalDragState.lastY) * 0.005;
    this._orbitalController.addAzimuth(-dx);
    this._orbitalController.addPitch(dy);
    this._orbitalDragState.lastX = event.clientX;
    this._orbitalDragState.lastY = event.clientY;
  }

  public onPointerUp(event: PointerEvent, _onThisObject: boolean): void {
    this._orbitalDragState.isDragging = false;
  }

  public onPointerCancel(event: PointerEvent): void {
    if (event.button !== 0) return;
    this._orbitalDragState.isDragging = false;
  }

  public postInitialize(): void {
    const gltf = this.assetLoader.getAsset<GLTF>(HelloWorldAssetIds.Cube);
    if (!gltf) {
      const msg = `CubeView: missing asset: ${HelloWorldAssetIds.Cube}`;
      this.logger.log(msg, LogTypes.Error);
      throw new Error(msg);
    }

    this._model = gltf.scene.clone(true);
    this._model.traverse((obj) => obj.layers.enable(POINTER_INPUT_LAYER));
    this.add(this._model);
  }

  rotate(dx: number, dy: number): void {
    if (!this._model) return;
    this._model.rotation.x += dx;
    this._model.rotation.y += dy;
  }

  setColor(hex: number): void {
    if (!this._model) return;

    this._model.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;

      const material = mesh.material;
      if (Array.isArray(material)) {
        for (const m of material) this.trySetMaterialColor(m, hex);
      } else {
        this.trySetMaterialColor(material, hex);
      }
    });
  }

  public preDestroy(): void {
    this._model = null;
    this._orbitalController = null;
  }

  private trySetMaterialColor(material: THREE.Material, hex: number): void {
    const maybeColor = (material as unknown as { color?: THREE.Color }).color;
    if (!maybeColor) return;
    maybeColor.set(hex);
  }
}
