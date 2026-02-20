import * as THREE from "three";
import type { IViewContainer } from "./views/IViewContainer.js";

type Create3DRendererOptions = ConstructorParameters<typeof THREE.WebGLRenderer>[0];

function create3DRenderer(options: Create3DRendererOptions = {}): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer(options);
  return renderer;
}

export type WorldCreateOptions = {
  /**
   * If provided and the canvas isn't connected, the canvas is appended here.
   */
  mount?: HTMLElement;

  /**
   * If provided, applied to the canvas via `className`.
   */
  canvasClassName?: string;
};

export class World implements IViewContainer {
  static async create(canvas?: HTMLCanvasElement, options: WorldCreateOptions = {}): Promise<World> {
    const c = canvas ?? document.createElement("canvas");
    if (options.canvasClassName !== undefined) c.className = options.canvasClassName;
    if (options.mount && !c.isConnected) options.mount.appendChild(c);
    return new World({ canvas: c });
  }

  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;

  constructor(params: { canvas: HTMLCanvasElement }) {
    this.renderer = create3DRenderer({
      canvas: params.canvas,
      antialias: true,
      stencil: true,
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
  }

  add(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  attachChild(child: any, parent: any): void {
    const p = parent as any;
    const c = child as any;

    // Allow `null` to mean "attach to World root (scene)".
    if (p === null) {
      this.add(c as THREE.Object3D);
      return;
    }

    // Support both `World` and `THREE.Object3D` (and any custom parent with an `.add()` method).
    if (p && typeof p.add === "function") {
      p.add(c);
      return;
    }

    throw new Error("Invalid world parent: expected a World/THREE.Object3D with .add(), or null");
  }

  resize(width: number, height: number, dpr: number): void {
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  render(): void {
    // Important when sharing a WebGL context with another renderer (e.g. PixiJS).
    this.renderer.resetState();
    this.renderer.render(this.scene, this.camera);
  }

  destroy(): void {
    this.renderer.dispose();
  }
}

