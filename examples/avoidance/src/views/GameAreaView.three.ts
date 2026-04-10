import * as THREE from "three";
import { WorldViewBase, type IInstanceResolver } from "@gamebyte/gamelabsjs";
import type { IGameAreaView } from "./IGameAreaView";
import { AvoidanceConfig } from "../AvoidanceConfig.js";
import { AvoidanceAssetIds } from "../AvoidanceAssetIds.js";

export class GameAreaView extends WorldViewBase implements IGameAreaView {
  private _config: AvoidanceConfig | null = null;
  private _areaSize = 0;

  // Game area meshes
  private _bgMesh: THREE.Mesh | null = null;
  private readonly _borderMeshes: THREE.Mesh[] = [];

  // Player
  private _playerMesh: THREE.Mesh | null = null;

  // Enemies
  private readonly _enemies = new Map<number, THREE.Mesh>();
  private _enemyTexture: THREE.Texture | null = null;

  public override inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._config = resolver.getInstance(AvoidanceConfig);
  }

  public override postInitialize(): void {
    const config = this._config!;
    this._areaSize = config.gameAreaSize;
    const size = this._areaSize;
    const halfSize = size / 2;

    // Background plane
    const bgTexture = this.assetLoader.getAsset<THREE.Texture>(AvoidanceAssetIds.Background);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x0a1a10 });
    if (bgTexture) {
      bgTexture.wrapS = THREE.RepeatWrapping;
      bgTexture.wrapT = THREE.RepeatWrapping;
      bgTexture.repeat.set(size / 256, size / 256);
      bgMat.map = bgTexture;
      bgMat.color.setHex(0xffffff);
    }
    const bgGeo = new THREE.PlaneGeometry(size, size);
    this._bgMesh = new THREE.Mesh(bgGeo, bgMat);
    this._bgMesh.rotation.x = -Math.PI / 2;
    this._bgMesh.position.set(halfSize, 0, halfSize);
    this.add(this._bgMesh);

    // Border (flat planes on the ground, visible from top-down camera)
    const borderColor = config.gameAreaBorderColor;
    const bw = config.gameAreaBorderWidth;
    const borderMat = new THREE.MeshBasicMaterial({ color: borderColor, side: THREE.DoubleSide });

    const makeBorder = (w: number, h: number, x: number, z: number): void => {
      const geo = new THREE.PlaneGeometry(w, h);
      const mesh = new THREE.Mesh(geo, borderMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, 0.05, z);
      this._borderMeshes.push(mesh);
      this.add(mesh);
    };

    // top (along X at z=0), bottom (z=size), left (along Z at x=0), right (x=size)
    makeBorder(size + bw * 2, bw, halfSize, -bw / 2);
    makeBorder(size + bw * 2, bw, halfSize, size + bw / 2);
    makeBorder(bw, size, -bw / 2, halfSize);
    makeBorder(bw, size, size + bw / 2, halfSize);

    // Player mesh
    const playerTexture = this.assetLoader.getAsset<THREE.Texture>(AvoidanceAssetIds.Player);
    const playerMat = new THREE.MeshBasicMaterial({ transparent: true, color: 0xffffff });
    if (playerTexture) playerMat.map = playerTexture;
    else playerMat.color.setHex(0x3cdc50);
    const pSize = config.playerSize;
    const playerGeo = new THREE.PlaneGeometry(pSize, pSize);
    this._playerMesh = new THREE.Mesh(playerGeo, playerMat);
    this._playerMesh.rotation.x = -Math.PI / 2;
    this._playerMesh.position.set(halfSize, 0.02, halfSize);
    this.add(this._playerMesh);

    // Cache enemy texture
    this._enemyTexture = this.assetLoader.getAsset<THREE.Texture>(AvoidanceAssetIds.Enemy) ?? null;
  }

  public setPlayerPosition(x: number, y: number): void {
    this._playerMesh?.position.set(x, 0.02, y);
  }

  public addEnemy(id: number, x: number, y: number): void {
    const eSize = this._config!.enemySize;
    const mat = new THREE.MeshBasicMaterial({ transparent: true, color: 0xffffff });
    if (this._enemyTexture) mat.map = this._enemyTexture;
    else mat.color.setHex(0xdc3232);
    const geo = new THREE.PlaneGeometry(eSize, eSize);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.02, y);
    this._enemies.set(id, mesh);
    this.add(mesh);
  }

  public setEnemyPosition(id: number, x: number, y: number): void {
    const mesh = this._enemies.get(id);
    if (mesh) mesh.position.set(x, 0.02, y);
  }

  public removeEnemy(id: number): void {
    const mesh = this._enemies.get(id);
    if (mesh) {
      this.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.MeshBasicMaterial).dispose();
      this._enemies.delete(id);
    }
  }

  public removeAllEnemies(): void {
    for (const [id, mesh] of this._enemies) {
      this.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.MeshBasicMaterial).dispose();
    }
    this._enemies.clear();
  }

  public override preDestroy(): void {
    this.removeAllEnemies();

    if (this._playerMesh) {
      this._playerMesh.geometry.dispose();
      (this._playerMesh.material as THREE.MeshBasicMaterial).dispose();
      this._playerMesh = null;
    }
    if (this._bgMesh) {
      this._bgMesh.geometry.dispose();
      (this._bgMesh.material as THREE.MeshBasicMaterial).dispose();
      this._bgMesh = null;
    }
    for (const m of this._borderMeshes) {
      m.geometry.dispose();
      (m.material as THREE.MeshBasicMaterial).dispose();
    }
    this._borderMeshes.length = 0;
    this._enemyTexture = null;
    this._config = null;
  }
}
