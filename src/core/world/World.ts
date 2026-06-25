import type { Camera, Object3D } from "three";
import { AmbientLight, DirectionalLight, Fog, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import type { ILogger } from "../dev/ILogger.js";
import type { IInputManager } from "../input/IInputManager.js";
import type { IWorld } from "./IWorld.js";
import type { IWorldPointerInput } from "./IWorldPointerInput.js";
import type { WorldViewBase } from "./WorldViewBase.three.js";
import { WorldPointerInput } from "./WorldPointerInput.js";

type Create3DRendererOptions = ConstructorParameters<typeof WebGLRenderer>[0];

function create3DRenderer(options: Create3DRendererOptions = {}): WebGLRenderer {
  const renderer = new WebGLRenderer(options);
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

export class World implements IWorld {
  //  MEMBERS
  private readonly _logger: ILogger | null;
  private _activeCamera: Camera;
  private _worldPointerInput: WorldPointerInput | null = null;

  static async create(canvas?: HTMLCanvasElement, options: WorldCreateOptions = {}): Promise<World> {
    const c = canvas ?? document.createElement("canvas");
    if (options.canvasClassName !== undefined) c.className = options.canvasClassName;
    if (options.mount && !c.isConnected) options.mount.appendChild(c);
    const params: { canvas: HTMLCanvasElement; logger?: ILogger } = { canvas: c };
    if (options.logger !== undefined) params.logger = options.logger;
    return new World(params);
  }

  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;

  get activeCamera(): Camera {
    return this._activeCamera;
  }

  //  CONSTRUCTOR
  constructor(params: { canvas: HTMLCanvasElement; logger?: ILogger }) {
    this.renderer = create3DRenderer({
      canvas: params.canvas,
      antialias: true,
      stencil: true,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x0b0f14, 1);

    this.scene = new Scene();
    this.scene.fog = new Fog(0x0b0f14, 4, 20);

    this.camera = new PerspectiveCamera(60, 1, 0.1, 100);
    this.camera.position.set(0, 1.2, 4);
    this._activeCamera = this.camera;

    const ambient = new AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    const dir = new DirectionalLight(0xffffff, 1.2);
    dir.position.set(3, 5, 2);
    this.scene.add(dir);

    this._logger = params.logger ?? null;
  }

  //  METHODS
  addView(view: WorldViewBase): void {
    this.scene.add(view);
  }

  removeView(view: WorldViewBase): void {
    this.scene.remove(view);
  }

  add(object: Object3D): void {
    this.scene.add(object);
  }

  setActiveCamera(camera: Camera): void {
    this._activeCamera = camera;
  }

  resize(width: number, height: number, dpr: number): void {
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
    if (this._activeCamera instanceof PerspectiveCamera) {
      this._activeCamera.aspect = width / height;
      this._activeCamera.updateProjectionMatrix();
    }
  }

  render(): void {
    // Important when sharing a WebGL context with another renderer (e.g. PixiJS).
    this.renderer.resetState();
    this.renderer.render(this.scene, this._activeCamera);
  }

  attachInput(inputManager: IInputManager): void {
    if (this._worldPointerInput) return;
    this._worldPointerInput = new WorldPointerInput(this.renderer.domElement as HTMLCanvasElement, this, inputManager);
  }

  get worldPointerInput(): IWorldPointerInput | null {
    return this._worldPointerInput;
  }

  destroy(): void {
    this.renderer.dispose();
  }
}
