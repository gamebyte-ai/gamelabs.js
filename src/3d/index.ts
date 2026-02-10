import * as THREE from "three";

export type Create3DRendererOptions = ConstructorParameters<typeof THREE.WebGLRenderer>[0];

/**
 * Creates a Three.js WebGLRenderer.
 * Kept minimal until you define a proper 3D pipeline (scene/camera/loop/etc).
 */
export function create3DRenderer(options: Create3DRendererOptions = {}): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer(options);
  return renderer;
}

