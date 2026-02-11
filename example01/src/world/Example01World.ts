import * as THREE from "three";
import { create3DRenderer } from "gamelabsjs/3d";

export class Example01World {
  static create(stageEl: HTMLElement, canvas?: HTMLCanvasElement): Example01World {
    const c = canvas ?? document.createElement("canvas");
    c.className = "layer world3d";
    if (!c.isConnected) stageEl.appendChild(c);
    return new Example01World({ canvas: c });
  }

  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;

  constructor(params: { canvas: HTMLCanvasElement }) {
    this.renderer = create3DRenderer({
      canvas: params.canvas,
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setClearColor(0x0b0f14, 1);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0b0f14, 4, 20);

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    this.camera.position.set(0, 1.2, 4);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(3, 5, 2);
    this.scene.add(dir);

    const grid = new THREE.GridHelper(20, 20, 0x223047, 0x152033);
    grid.position.y = -0.75;
    this.scene.add(grid);
  }

  add(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  resize(width: number, height: number, dpr: number): void {
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  destroy(): void {
    this.renderer.dispose();
  }
}

