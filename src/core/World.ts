import * as THREE from "three";

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

export class World {
  static async create(canvas?: HTMLCanvasElement, options: WorldCreateOptions = {}): Promise<World> {
    const c = canvas ?? document.createElement("canvas");
    if (options.canvasClassName !== undefined) c.className = options.canvasClassName;
    if (options.mount && !c.isConnected) options.mount.appendChild(c);
    return new World({ canvas: c });
  }

  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  private groundGrid: THREE.GridHelper | null = null;

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
  }

  showGroundGrid(options: {
    size?: number;
    divisions?: number;
    color1?: THREE.ColorRepresentation;
    color2?: THREE.ColorRepresentation;
    y?: number;
  } = {}): THREE.GridHelper {
    const size = options.size ?? 20;
    const divisions = options.divisions ?? 20;
    const color1 = options.color1 ?? 0x223047;
    const color2 = options.color2 ?? 0x152033;
    const y = options.y ?? 0;

    if (this.groundGrid) {
      // Replace the existing grid if parameters changed.
      this.scene.remove(this.groundGrid);
      this.groundGrid.geometry.dispose();
      const material = this.groundGrid.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material.dispose();
      this.groundGrid = null;
    }

    const grid = new THREE.GridHelper(size, divisions, color1, color2);
    grid.position.y = y;
    this.scene.add(grid);
    this.groundGrid = grid;
    return grid;
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
    if (this.groundGrid) {
      this.scene.remove(this.groundGrid);
      this.groundGrid.geometry.dispose();
      const material = this.groundGrid.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material.dispose();
      this.groundGrid = null;
    }
    this.renderer.dispose();
  }
}

