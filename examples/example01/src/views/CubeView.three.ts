import * as THREE from "three";
import { WorldViewBase } from "gamelabsjs";
import type { ICubeView } from "./ICubeView";

export class CubeView extends WorldViewBase implements ICubeView {
  private mesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> | null = null;

  public postInitialize(): void {
    this.mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.35, metalness: 0.1 })
    );
    this.add(this.mesh);
  }

  rotate(dx: number, dy: number): void {
    if (!this.mesh) return;
    this.mesh.rotation.x += dx;
    this.mesh.rotation.y += dy;
  }

  setColor(hex: number): void {
    if (!this.mesh) return;
    this.mesh.material.color.set(hex);
  }

  destroy(): void {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = null;
    }
    super.destroy();
  }
}

