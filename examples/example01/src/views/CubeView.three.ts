import * as THREE from "three";
import { WorldViewBase } from "gamelabsjs";
import type { ICubeView } from "./ICubeView";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Example01Assets } from "../Example01Assets";

export class CubeView extends WorldViewBase implements ICubeView {
  private _model: THREE.Object3D | null = null;

  public postInitialize(): void {
    const gltf = this.assetLoader.getAsset<GLTF>(Example01Assets.Cube.id);
    if (!gltf) throw new Error(`CubeView: missing asset: ${Example01Assets.Cube.id}`);

    this._model = gltf.scene.clone(true);
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

  destroy(): void {
    this._model = null;
    super.destroy();
  }

  private trySetMaterialColor(material: THREE.Material, hex: number): void {
    const maybeColor = (material as unknown as { color?: THREE.Color }).color;
    if (!maybeColor) return;
    maybeColor.set(hex);
  }
}

