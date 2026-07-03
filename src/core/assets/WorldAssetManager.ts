import type { Texture as ThreeTexture } from "three";
import { BoxGeometry, DataTexture, Group, Mesh, MeshBasicMaterial, TextureLoader } from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { AssetManager } from "./AssetManager.js";
import { AssetTypes, type AssetType } from "./AssetTypes.js";

/**
 * Three.js-aware asset manager. Adds default fallbacks and loaders for
 * `AssetTypes.WorldTexture` and `AssetTypes.GLTF`, which the base manager
 * leaves unimplemented so that 2D / renderer-free builds can skip three.js.
 */
export class WorldAssetManager extends AssetManager {
  private _defaultWorldTexture: ThreeTexture | null = null;
  private _defaultGltf: GLTF | null = null;

  protected override getDefaultWorldAsset(type: AssetType): unknown {
    switch (type) {
      case AssetTypes.WorldTexture:
        return this.getDefaultWorldTexture();
      case AssetTypes.GLTF:
        return this.getDefaultGltf();
      default:
        return super.getDefaultWorldAsset(type);
    }
  }

  protected override loadWorldAsset(type: AssetType, url: string): Promise<unknown> {
    switch (type) {
      case AssetTypes.WorldTexture:
        return this.loadWorldTexture(url);
      case AssetTypes.GLTF:
        return this.loadGltf(url);
      default:
        return super.loadWorldAsset(type, url);
    }
  }

  private getDefaultWorldTexture(): ThreeTexture {
    if (this._defaultWorldTexture) return this._defaultWorldTexture;
    const data = new Uint8Array([128, 0, 128, 255]);
    this._defaultWorldTexture = new DataTexture(data, 1, 1);
    this._defaultWorldTexture.needsUpdate = true;
    return this._defaultWorldTexture;
  }

  private getDefaultGltf(): GLTF {
    if (this._defaultGltf) return this._defaultGltf;
    const scene = new Group();
    scene.name = "GLTF_Fallback";
    const geometry = new BoxGeometry(1, 1, 1);
    const material = new MeshBasicMaterial({ color: 0x800080 });
    const mesh = new Mesh(geometry, material);
    scene.add(mesh);
    this._defaultGltf = {
      scene,
      scenes: [scene],
      animations: [],
      cameras: [],
      asset: { version: "2.0", generator: "Gamelab-Fallback" },
      parser: null as unknown as GLTF["parser"],
      userData: {},
    };
    return this._defaultGltf;
  }

  private async loadWorldTexture(url: string): Promise<ThreeTexture> {
    const loader = new TextureLoader();
    return loader.loadAsync(url);
  }

  private async loadGltf(url: string): Promise<unknown> {
    const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
    const loader = new GLTFLoader();
    return loader.loadAsync(url);
  }
}
