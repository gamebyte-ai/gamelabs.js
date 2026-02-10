import { GamelabsApp } from "gamelabsjs";
import { create2DApp } from "gamelabsjs/2d";
import { create3DRenderer } from "gamelabsjs/3d";
import * as THREE from "three";
import * as PIXI from "pixi.js";

export class Example01App extends GamelabsApp {
  readonly stageEl: HTMLElement;

  renderer!: THREE.WebGLRenderer;
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;

  uiApp!: PIXI.Application;
  cube!: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;

  constructor(stageEl: HTMLElement) {
    super({ mode: "3d" });
    this.stageEl = stageEl;
  }

  override async initialize(): Promise<void> {
    
    this.initWorld();
    await this.initUI();  

    this.createWorld();
    this.createUI();
    this.onResize();
  }

  override step(timestepSeconds: number): void {
    this.cube.rotation.x += timestepSeconds * 0.6;
    this.cube.rotation.y += timestepSeconds * 0.9;
    this.renderer.render(this.scene, this.camera);
  }

  private initWorld(): void {

    // --- Three.js: 3D world canvas (bottom layer)
    this.canvas.className = "layer world3d";
    this.stageEl.appendChild(this.canvas);

    // --- Three.js renderer (WebGL)
    this.renderer = create3DRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance"
    });
    this.renderer.setClearColor(0x0b0f14, 1);
  }

  private createWorld(): void {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0b0f14, 4, 20);

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    this.camera.position.set(0, 1.2, 4);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(3, 5, 2);
    this.scene.add(dir);

    this.cube = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.35, metalness: 0.1 })
    );
    this.scene.add(this.cube);

    const grid = new THREE.GridHelper(20, 20, 0x223047, 0x152033);
    grid.position.y = -0.75;
    this.scene.add(grid);
  }

  private async initUI(): Promise<void> {

    this.uiApp = await create2DApp({
      backgroundAlpha: 0,
      antialias: true
    });

    this.uiApp.canvas.className = "layer ui2d";
    this.stageEl.appendChild(this.uiApp.canvas);
  }

  private createUI(): void {
    const label = new PIXI.Text({
      text: "Pixi UI over Three world",
      style: {
        fill: 0xe8eef6,
        fontSize: 18,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial"
      }
    });
    label.position.set(16, 14);
    this.uiApp.stage.addChild(label);

    const button = new PIXI.Container();
    button.eventMode = "static";
    button.cursor = "pointer";
    button.position.set(16, 50);

    const btnBg = new PIXI.Graphics()
      .roundRect(0, 0, 220, 44, 12)
      .fill({ color: 0x111827, alpha: 0.85 })
      .stroke({ color: 0x334155, width: 1 });
    button.addChild(btnBg);

    const btnText = new PIXI.Text({
      text: "Click: toggle cube color",
      style: { fill: 0xe8eef6, fontSize: 14 }
    });
    btnText.position.set(14, 12);
    button.addChild(btnText);

    this.uiApp.stage.addChild(button);

    let toggled = false;
    button.on("pointertap", () => {
      toggled = !toggled;
      this.cube.material.color.set(toggled ? 0xf97316 : 0x3b82f6);
    });
  }

  private resizeToStage(): void {
    const rect = this.stageEl.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    super.resize(width, height);

    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    if (this.uiApp) this.uiApp.renderer.resize(width, height);
  }

  override onResize(): void {
    // Guard against resize firing before `initialize()` finishes.
    if (!this.renderer || !this.scene || !this.camera) return;
    this.resizeToStage();
  }

  destroy(): void {
    super.destroy();

    this.renderer.dispose();
    this.uiApp.destroy(true, { children: true, texture: true, textureSource: true });

    this.canvas.remove();
    this.uiApp.canvas.remove();
  }
}

