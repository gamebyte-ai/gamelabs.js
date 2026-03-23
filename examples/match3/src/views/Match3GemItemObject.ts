import * as THREE from "three";
import gsap from "gsap";
import type { IAssetManager, IInputManager } from "gamelabsjs";
import { GridItemObject, type IGridObjectListener } from "gamelabsjs";
import { Match3Config } from "../Match3Config.js";
import type { Match3GemItemObjectOptions } from "./Match3GemItemObjectOptions.js";

export class Match3GemItemObject extends GridItemObject {
  private static readonly SELECTION_ACCENT = 0xfbbf24;
  private static readonly SELECTION_SCALE = 1.1;

  private _mesh: THREE.Mesh | null = null;
  /** Wireframe shell drawn on top of depth so it is never hidden inside the gem mesh. */
  private _selectionShell: THREE.Mesh | null = null;
  /** Flat ring slightly below the gem center for a second read on the board plane. */
  private _selectionHalo: THREE.Mesh | null = null;

  public constructor(options: Match3GemItemObjectOptions, pointerListener: IGridObjectListener, inputManager: IInputManager | null, assetManager?: IAssetManager | null) {
    super(options, pointerListener, inputManager, assetManager);
  }

  protected override createVisual(): void {
    const gemType = (this._options as Match3GemItemObjectOptions).gemType;
    const palette = Match3Config.GEM_PALETTE;
    const color = palette[gemType % palette.length] ?? 0xffffff;
    const radius = Math.min(this.preset.columnSize, this.preset.rowSize) * 0.32;
    const y = radius * 0.85;
    const geom = new THREE.SphereGeometry(radius, 20, 16);
    const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.25, roughness: 0.45, emissive: 0x000000 });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(0, y, 0);
    mesh.castShadow = true;
    this.add(mesh);
    this._mesh = mesh;
    const shellGeom = new THREE.IcosahedronGeometry(radius * 1.2, 1);
    const shellMat = new THREE.MeshBasicMaterial({
      color: Match3GemItemObject.SELECTION_ACCENT,
      wireframe: true,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
      depthWrite: false
    });
    const shell = new THREE.Mesh(shellGeom, shellMat);
    shell.position.set(0, y, 0);
    shell.visible = false;
    shell.renderOrder = 100;
    this.add(shell);
    this._selectionShell = shell;
    const haloR = radius * 1.15;
    const haloGeom = new THREE.RingGeometry(haloR * 0.72, haloR, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: Match3GemItemObject.SELECTION_ACCENT,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const halo = new THREE.Mesh(haloGeom, haloMat);
    halo.position.set(0, 0.02, 0);
    halo.rotation.x = -Math.PI / 2;
    halo.visible = false;
    halo.renderOrder = 99;
    this.add(halo);
    this._selectionHalo = halo;
  }

  public setHighlighted(on: boolean): void {
    if (this._selectionShell) this._selectionShell.visible = on;
    if (this._selectionHalo) this._selectionHalo.visible = on;
    this.scale.setScalar(on ? Match3GemItemObject.SELECTION_SCALE : 1);
    const stdMat = this._mesh?.material;
    if (stdMat instanceof THREE.MeshStandardMaterial) {
      if (on) {
        stdMat.emissive.setHex(0xfbbf24);
        stdMat.emissiveIntensity = 0.85;
        stdMat.metalness = 0.5;
      } else {
        stdMat.emissive.setHex(0x000000);
        stdMat.emissiveIntensity = 0;
        stdMat.metalness = 0.25;
      }
    }
  }

  public killAnimations(): void {
    gsap.killTweensOf(this);
    gsap.killTweensOf(this.position);
    gsap.killTweensOf(this.scale);
  }

  protected override createCollider(): void {}
}
