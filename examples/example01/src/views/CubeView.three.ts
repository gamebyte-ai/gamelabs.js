import * as THREE from "three";
import type { ICubeView } from "./ICubeView";

export class CubeView extends THREE.Group implements ICubeView {
  private readonly mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;

  constructor() {
    super();

    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.35, metalness: 0.1 })
    );
    this.add(this.mesh);
  }

  rotate(dx: number, dy: number): void {
    this.mesh.rotation.x += dx;
    this.mesh.rotation.y += dy;
  }

  setColor(hex: number): void {
    this.mesh.material.color.set(hex);
  }

  destroy(): void {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.removeFromParent();
  }
}

