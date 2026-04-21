import * as THREE from "three";
import { World, WorldViewBase, type IInstanceResolver } from "@gamebyte/gamelabsjs";
import { TowerDefenseConfig } from "../TowerDefenseConfig.js";
import { LevelManager } from "../utilities/LevelManager.js";
import { BillboardHealthBar } from "./BillboardHealthBar.js";
import type { IGameSceneView } from "./IGameSceneView.js";

/**
 * World-scene host: owns the enemy / combat containers, the base HP bar,
 * and the game-specific lighting rig.
 *
 * Per AGENTS.md "Scene setup (fog, lights, post-processing) belongs in
 * views, not in the app class", all Three.js scene configuration lives
 * here rather than in TowerDefenseApp.
 *
 * Lighting design for the terrain-textured tower-defense grid:
 *
 * - **HemisphereLight** — provides soft sky/ground gradient ambient fill.
 *   Warm blue-white from above, dark green reflection from below. Gives
 *   the grass/stone textures a natural outdoor look without flat
 *   illumination.
 *
 * - **Main DirectionalLight ("sun")** — warm white key light from the
 *   upper-left at a steep angle. Casts PCF soft shadows across the grid
 *   so towers, pillars and enemies have visible ground shadows. The
 *   shadow camera frustum covers the 10 x 10 grid.
 *
 * - **Fill DirectionalLight** — cool blue fill from the opposite side.
 *   Low intensity, no shadows. Fills the shadow-side of objects so they
 *   stay readable without being washed out.
 *
 * Fog is adjusted to keep the entire grid clear at the default camera
 * distance (10 units) while still fading distant edges into the
 * background for atmosphere.
 */
export class GameSceneView extends WorldViewBase implements IGameSceneView {
  private static readonly BASE_BAR_W = 0.6;
  private static readonly BASE_BAR_H = 0.08;
  private static readonly BASE_BAR_Y = 0.55;

  private readonly _enemyContainer = new THREE.Group();
  private readonly _combatContainer = new THREE.Group();
  private _baseHpBar: BillboardHealthBar | null = null;
  private _config: TowerDefenseConfig | null = null;
  private _level: LevelManager | null = null;
  private _world: World | null = null;

  public get enemyContainer(): THREE.Group {
    return this._enemyContainer;
  }

  public get combatContainer(): THREE.Group {
    return this._combatContainer;
  }

  public override inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._config = resolver.getInstance(TowerDefenseConfig);
    this._level = resolver.getInstance(LevelManager);
    this._world = resolver.getInstance(World);
  }

  public override initialize(): void {
    super.initialize();
    if (!this._config) return;

    // ── Containers ──────────────────────────────────────────────────────
    const midX = ((this._config.cols - 1) * this._config.cellSize) * 0.5;
    const midZ = ((this._config.rows - 1) * this._config.cellSize) * 0.5;
    this._enemyContainer.position.set(-midX, 0, -midZ);
    this._combatContainer.position.set(-midX, 0, -midZ);
    this.add(this._enemyContainer);
    this.add(this._combatContainer);

    // ── Lighting & atmosphere ───────────────────────────────────────────
    this._setupLighting();
  }

  // ── Lighting rig ─────────────────────────────────────────────────────

  private _setupLighting(): void {
    if (!this._world) return;
    const scene = this._world.scene;
    const renderer = this._world.renderer;

    // Disable the default lights that World.ts added (AmbientLight 0.6 +
    // DirectionalLight 1.2). We replace them with a terrain-tuned rig.
    scene.traverse((child) => {
      if (child instanceof THREE.Light) child.intensity = 0;
    });

    // 1. Hemisphere light — sky/ground ambient fill.
    //    Sky: soft warm blue-white. Ground: dark green (terrain reflection).
    const hemi = new THREE.HemisphereLight(0xb4c8e0, 0x1a2a1a, 0.8);
    scene.add(hemi);

    // 2. Main directional ("sun") — warm key light with soft shadows.
    //    Position: upper-left relative to the camera's default 45° azimuth.
    //    Shadow frustum sized to cover the 10 x 10 grid with some margin.
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.6);
    sun.position.set(-5, 10, -3);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(1024);
    sun.shadow.camera.left = -8;
    sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8;
    sun.shadow.camera.bottom = -8;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 25;
    sun.shadow.bias = -0.002;
    sun.shadow.normalBias = 0.02;
    scene.add(sun);

    // 3. Fill directional — cool side-fill from the opposite direction.
    //    No shadows, just lifts readability on the shaded side of objects.
    const fill = new THREE.DirectionalLight(0xd0e0ff, 0.35);
    fill.position.set(4, 5, 6);
    scene.add(fill);

    // 4. Enable soft shadow maps on the renderer.
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 5. Procedural sky gradient background.
    //    A vertical gradient from horizon haze to upper-sky blue, rendered
    //    onto a large inverted sphere so the camera always sees sky.
    const skySize = 256;
    const skyCanvas = document.createElement("canvas");
    skyCanvas.width = 1;
    skyCanvas.height = skySize;
    const skyCtx = skyCanvas.getContext("2d")!;
    const grad = skyCtx.createLinearGradient(0, 0, 0, skySize);
    grad.addColorStop(0, "#1a2a44");     // zenith — deep blue
    grad.addColorStop(0.5, "#3a5a7a");   // mid sky
    grad.addColorStop(0.85, "#6a8aaa");  // near horizon
    grad.addColorStop(1, "#8aaabb");      // horizon haze
    skyCtx.fillStyle = grad;
    skyCtx.fillRect(0, 0, 1, skySize);
    const skyTex = new THREE.CanvasTexture(skyCanvas);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    scene.background = skyTex;

    // 6. Fog matches the horizon colour for seamless blending.
    scene.fog = new THREE.Fog(0x6a8aaa, 14, 35);
    renderer.setClearColor(0x6a8aaa, 1);
  }

  // ── Base HP bar ──────────────────────────────────────────────────────

  public showBaseHpBar(): void {
    this.hideBaseHpBar();
    if (!this._config || !this._level) return;
    const path = this._level.pathWaypoints;
    if (path.length === 0) return;

    const [baseCol, baseRow] = path[path.length - 1];
    const midX = ((this._config.cols - 1) * this._config.cellSize) * 0.5;
    const midZ = ((this._config.rows - 1) * this._config.cellSize) * 0.5;

    const { BASE_BAR_W, BASE_BAR_H, BASE_BAR_Y } = GameSceneView;
    this._baseHpBar = new BillboardHealthBar(BASE_BAR_W, BASE_BAR_H, 0x440000, 0xdd8844);
    this._baseHpBar.position.set(baseCol - midX, BASE_BAR_Y, baseRow - midZ);
    this.add(this._baseHpBar);
    this._baseHpBar.setRatio(1);
  }

  public setBaseHpRatio(ratio: number): void {
    this._baseHpBar?.setRatio(ratio);
  }

  public hideBaseHpBar(): void {
    if (this._baseHpBar) {
      this._baseHpBar.dispose();
      this._baseHpBar.removeFromParent();
      this._baseHpBar = null;
    }
  }

  // ── Gold popup ─────────────────────────────────────────────────────

  private static readonly POPUP_SIZE = 64;
  private static readonly POPUP_RISE = 0.8;
  private static readonly POPUP_DURATION = 0.8;

  /**
   * Show a small floating "+Xg" sprite at the enemy container's local
   * coordinates. The sprite rises and fades out over ~0.8s, then
   * self-destructs.
   */
  public showGoldPopup(localX: number, localZ: number, amount: number): void {
    const sprite = GameSceneView._createGoldSprite(amount);
    sprite.position.set(localX, 0.5, localZ);
    this._enemyContainer.add(sprite);

    const startY = 0.5;
    const endY = startY + GameSceneView.POPUP_RISE;
    const dur = GameSceneView.POPUP_DURATION;
    const startMs = typeof performance !== "undefined" ? performance.now() : Date.now();

    const step = (): void => {
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      const t = Math.min(1, (now - startMs) / (dur * 1000));
      sprite.position.y = startY + (endY - startY) * t;
      (sprite.material as THREE.SpriteMaterial).opacity = 1 - t;
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        (sprite.material as THREE.SpriteMaterial).dispose();
        sprite.removeFromParent();
      }
    };
    requestAnimationFrame(step);
  }

  private static _createGoldSprite(amount: number): THREE.Sprite {
    const sz = GameSceneView.POPUP_SIZE;
    const canvas = document.createElement("canvas");
    canvas.width = sz;
    canvas.height = sz;
    const ctx = canvas.getContext("2d")!;
    ctx.font = "bold 28px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffdd44";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 3;
    const text = `+${amount}g`;
    ctx.strokeText(text, sz / 2, sz / 2);
    ctx.fillText(text, sz / 2, sz / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.4, 0.4, 1);
    sprite.renderOrder = 200;
    return sprite;
  }

  public override preDestroy(): void {
    this.hideBaseHpBar();
    this._enemyContainer.removeFromParent();
    this._combatContainer.removeFromParent();
    super.preDestroy();
  }
}
