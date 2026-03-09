import * as THREE from "three";
import type { IViewContainer } from "./views/IViewContainer.js";
import type { ILogger } from "./dev/ILogger.js";
import { LogTypes } from "./dev/LogTypes.js";

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

  /**
   * Optional logger for error logging.
   */
  logger?: ILogger;
};

export class World implements IViewContainer {
  private readonly _logger: ILogger | null;
  private _activeCamera: THREE.Camera;

  static async create(canvas?: HTMLCanvasElement, options: WorldCreateOptions = {}): Promise<World> {
    const c = canvas ?? document.createElement("canvas");
    if (options.canvasClassName !== undefined) c.className = options.canvasClassName;
    if (options.mount && !c.isConnected) options.mount.appendChild(c);
    const params: { canvas: HTMLCanvasElement; logger?: ILogger } = { canvas: c };
    if (options.logger !== undefined) params.logger = options.logger;
    return new World(params);
  }

  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;

  get activeCamera(): THREE.Camera {
    return this._activeCamera;
  }

  constructor(params: { canvas: HTMLCanvasElement; logger?: ILogger }) {
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
    this._activeCamera = this.camera;

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(3, 5, 2);
    this.scene.add(dir);

    this._logger = params.logger ?? null;
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

    const msg = "Invalid world parent: expected a World/THREE.Object3D with .add(), or null";
    this._logger?.log(msg, LogTypes.Error);
    throw new Error(msg);
  }

  setActiveCamera(camera: THREE.Camera): void {
    this._activeCamera = camera;
  }

  resize(width: number, height: number, dpr: number): void {
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
    if (this._activeCamera instanceof THREE.PerspectiveCamera) {
      this._activeCamera.aspect = width / height;
      this._activeCamera.updateProjectionMatrix();
    }
  }

  render(): void {
    // Important when sharing a WebGL context with another renderer (e.g. PixiJS).
    this.renderer.resetState();
    this.renderer.render(this.scene, this._activeCamera);
  }

  destroy(): void {
    this.renderer.dispose();
  }
}

