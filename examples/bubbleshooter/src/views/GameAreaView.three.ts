import * as THREE from "three";
import { WorldViewBase, World, type IInstanceResolver, type Unsubscribe } from "@gamebyte/gamelabsjs";
import type { IGameAreaView } from "./IGameAreaView";
import { BubbleShooterConfig } from "../BubbleShooterConfig";
import { BubbleGridLayout } from "../utilities/BubbleGridLayout";
import type { IAimTrajectory, IAimTrajectorySegment } from "../models/IAimTrajectory";
import { ALL_BUBBLE_COLORS, BUBBLE_COLOR_HEX, BUBBLE_COLORS, type BubbleColor } from "../constants/BubbleColor";
import { BUBBLE_COLOR_TO_ASSET_ID, BubbleShooterAssetIds } from "../BubbleShooterAssetIds";

const CELL_RING_SEGMENTS = 32;
const SHOOTER_RING_SEGMENTS = 48;
const LANDING_PREVIEW_SEGMENTS = 48;
const AIM_DOT_SEGMENTS = 14;
const BUBBLE_DISC_SEGMENTS = 48;
const BUBBLE_VISUAL_RADIUS_FACTOR = 0.94;
const PARTICLE_SEGMENTS = 10;
const SHOOTER_Z = 0.2;
const AIM_DOT_Z = 0.4;
const PARTICLE_Z = 0.5;
const SCORE_POPUP_Z = 0.6;
const SCORE_POPUP_CANVAS_W = 192;
const SCORE_POPUP_CANVAS_H = 72;

interface IPopParticle {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.MeshBasicMaterial;
  vx: number;
  vy: number;
  age: number;
  lifetime: number;
  active: boolean;
}

interface IShooterSwapAnim {
  age: number;
  readonly duration: number;
  readonly newHeldColor: BubbleColor;
  readonly newNextColor: BubbleColor;
  readonly heldFromX: number;
  readonly heldFromY: number;
  readonly heldToX: number;
  readonly heldToY: number;
  readonly heldFromScale: number;
  readonly heldToScale: number;
  readonly nextFromX: number;
  readonly nextFromY: number;
  readonly nextToX: number;
  readonly nextToY: number;
  readonly nextFromScale: number;
  readonly nextToScale: number;
}

interface IScorePopup {
  readonly mesh: THREE.Mesh;
  readonly geometry: THREE.PlaneGeometry;
  readonly material: THREE.MeshBasicMaterial;
  readonly canvas: HTMLCanvasElement;
  readonly canvasCtx: CanvasRenderingContext2D;
  readonly texture: THREE.CanvasTexture;
  startY: number;
  rise: number;
  age: number;
  lifetime: number;
}

/**
 * Renders the play area frame, the empty bubble grid as outline-only
 * circles, the placed bubbles, the shooter (ring + held bubble + rotating
 * barrel), and the dotted aim line. Cell positions come from
 * {@link BubbleGridLayout}; the play area is centred at the world origin.
 *
 * Aim input is captured via a `pointermove` listener on the renderer's
 * canvas, unprojected to world coordinates, and forwarded to listeners
 * registered through {@link onAimAtWorld}. The controller decides what to
 * do with that signal.
 */
export class GameAreaView extends WorldViewBase implements IGameAreaView {
  private _config: BubbleShooterConfig | null = null;
  private _layout: BubbleGridLayout | null = null;
  private _world: World | null = null;
  private _previousSceneFog: THREE.Fog | THREE.FogExp2 | null = null;

  private _backgroundMesh: THREE.Mesh | null = null;
  private readonly _borderMeshes: THREE.Mesh[] = [];
  private readonly _cellMeshes: THREE.Mesh[] = [];

  private _bubbleGeometry: THREE.CircleGeometry | null = null;
  private readonly _bubbleMaterials = new Map<BubbleColor, THREE.MeshBasicMaterial>();
  private readonly _bubbleMeshes = new Map<string, THREE.Mesh>();

  private _shooterGroup: THREE.Group | null = null;
  private _shooterRingMesh: THREE.Mesh | null = null;
  private _shooterBarrelMesh: THREE.Mesh | null = null;
  private _shooterBubbleMesh: THREE.Mesh | null = null;

  private _aimDotGeometry: THREE.CircleGeometry | null = null;
  private _aimDotMaterial: THREE.MeshBasicMaterial | null = null;
  /** Tail-fade materials. Index 0 = closest to landing (most faded);
   *  index K-1 = K-th from the end (least faded). Earlier dots reuse
   *  {@link _aimDotMaterial} at full opacity. */
  private readonly _aimDotFadeMaterials: THREE.MeshBasicMaterial[] = [];
  /** Power-up colour variants — same palette structure, red instead of white. */
  private _aimDotMaterialPowerUp: THREE.MeshBasicMaterial | null = null;
  private readonly _aimDotFadeMaterialsPowerUp: THREE.MeshBasicMaterial[] = [];
  private _aimDotPowerUpMode = false;
  private readonly _aimDotPool: THREE.Mesh[] = [];
  private _activeAimDots = 0;

  private _aimSegments: readonly IAimTrajectorySegment[] = [];
  private readonly _aimSegLengths: number[] = [];
  private readonly _aimSegCumLengths: number[] = [];
  private _aimTotalLength = 0;
  /** Persistent phase offset in [0, spacing); preserved across trajectory
   *  re-emits so the dot stream keeps marching when the player re-aims. */
  private _aimPhaseOffset = 0;

  private _landingPreviewGeometry: THREE.RingGeometry | null = null;
  private _landingPreviewMesh: THREE.Mesh | null = null;
  private readonly _landingPreviewMaterials = new Map<BubbleColor, THREE.MeshBasicMaterial>();
  private _landingPreviewColor: BubbleColor | null = null;

  private _flyingBubbleMesh: THREE.Mesh | null = null;

  /** Shared bomb material; reused for both shooter-held bomb and in-flight bomb. */
  private _bombMaterial: THREE.MeshBasicMaterial | null = null;
  private _shooterBombMesh: THREE.Mesh | null = null;
  private _flyingBombMesh: THREE.Mesh | null = null;

  /** Shared fireball material for held + flying meshes. */
  private _fireballMaterial: THREE.MeshBasicMaterial | null = null;
  private _shooterFireballMesh: THREE.Mesh | null = null;
  private _flyingFireballMesh: THREE.Mesh | null = null;

  /** Live falling-bubble meshes keyed by ops-side falling-bubble id. */
  private readonly _fallingBubbleMeshes = new Map<number, THREE.Mesh>();

  private _particleGeometry: THREE.CircleGeometry | null = null;
  private readonly _particles: IPopParticle[] = [];

  private readonly _scorePopups: IScorePopup[] = [];
  private readonly _scorePopupPool: IScorePopup[] = [];

  private _nextSlotIconMesh: THREE.Mesh | null = null;
  private _nextBubbleMesh: THREE.Mesh | null = null;
  /** Active swap animation; lerps held + next mesh positions/scales past each other. */
  private _shooterSwapAnim: IShooterSwapAnim | null = null;

  private readonly _aimListeners = new Set<(worldX: number, worldY: number) => void>();
  private readonly _fireListeners = new Set<() => void>();
  private readonly _swapListeners = new Set<() => void>();
  private _canvasEl: HTMLCanvasElement | null = null;
  private _pointerEventTarget: HTMLElement | null = null;

  private _gridLeftX = 0;
  private _gridTopY = 0;

  public override inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._config = resolver.getInstance(BubbleShooterConfig);
    this._layout = resolver.getInstance(BubbleGridLayout);
    this._world = resolver.getInstance(World);
  }

  public override postInitialize(): void {
    super.postInitialize();
    const config = this._config!;
    const layout = this._layout!;

    // World ships a small-scale fog (near 4, far 20) tuned for typical 3D
    // scenes. Our world units are pixel-sized and the camera focal point
    // is hundreds of units away, so the default fog would render the
    // entire grid as the background colour. Turn it off while we're
    // mounted; preDestroy restores whatever was there before.
    if (this._world) {
      this._previousSceneFog = this._world.scene.fog ?? null;
      this._world.scene.fog = null;
    }

    this._buildBackground(layout.areaWidth, layout.areaHeight, config.playAreaBgColor);
    this._buildBorder(layout.areaWidth, layout.areaHeight, config.playAreaBorderWidth, config.playAreaBorderColor);

    this._gridLeftX = layout.gridOriginX;
    this._gridTopY = layout.gridOriginY;
    this._buildCellOutlines(this._gridLeftX, this._gridTopY, layout, config);

    this._buildBubbleResources(layout.bubbleRadius);
    this._buildShooter(config, layout);
    this._buildNextSlot(config, layout);
    this._buildAimDotResources(config);
    this._buildLandingPreview(config);
    this._buildFlyingBubble();
    this._buildBombResources(layout);
    this._buildFireballResources(layout);
    this._buildParticleResources(config);
    this._attachPointerListener();
  }

  public setBubble(row: number, col: number, color: BubbleColor): void {
    const layout = this._layout;
    const geometry = this._bubbleGeometry;
    if (!layout || !geometry) return;
    const material = this._bubbleMaterials.get(color);
    if (!material) return;

    const local = layout.getCellLocalPosition(row, col);
    const x = this._gridLeftX + local.x;
    const y = this._gridTopY - local.y;
    const key = this._bubbleKey(row, col);

    let mesh = this._bubbleMeshes.get(key);
    if (mesh) {
      mesh.material = material;
      mesh.position.set(x, y, 0);
      return;
    }
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, 0);
    this._bubbleMeshes.set(key, mesh);
    this.add(mesh);
  }

  public removeBubble(row: number, col: number): void {
    const key = this._bubbleKey(row, col);
    const mesh = this._bubbleMeshes.get(key);
    if (!mesh) return;
    this.remove(mesh);
    this._bubbleMeshes.delete(key);
  }

  public setShooterHeldColor(color: BubbleColor | null): void {
    if (this._shooterBubbleMesh) {
      if (color === null) {
        this._shooterBubbleMesh.visible = false;
      } else {
        const material = this._bubbleMaterials.get(color);
        if (material) {
          this._shooterBubbleMesh.material = material;
          this._shooterBubbleMesh.visible = true;
        }
      }
    }
    if (color !== null) {
      const previewMat = this._landingPreviewMaterials.get(color);
      if (previewMat && this._landingPreviewMesh) {
        this._landingPreviewMesh.material = previewMat;
      }
      this._landingPreviewColor = color;
    }
  }

  public setShooterIsBomb(active: boolean): void {
    if (!this._shooterBombMesh) return;
    this._shooterBombMesh.visible = active;
    if (active && this._shooterBubbleMesh) {
      // Bomb takes over the held slot — hide the colour bubble. The
      // matching `setShooterHeldColor(null)` event already hides it,
      // but be defensive in case the order arrives reversed.
      this._shooterBubbleMesh.visible = false;
    }
  }

  public setShooterIsFireball(active: boolean): void {
    if (!this._shooterFireballMesh) return;
    this._shooterFireballMesh.visible = active;
    if (active && this._shooterBubbleMesh) this._shooterBubbleMesh.visible = false;
  }

  public playShooterSwap(newHeld: BubbleColor, newNext: BubbleColor): void {
    const config = this._config;
    const layout = this._layout;
    if (!config || !layout || !this._shooterBubbleMesh || !this._nextBubbleMesh) return;
    // If a previous swap is still mid-flight, snap it to its end state
    // before starting a new one. (In practice the ops state machine
    // gates new swaps on `swapping`, but be defensive.)
    if (this._shooterSwapAnim) this._finalizeShooterSwap();

    // Update the landing preview to the new held colour right away so
    // the aim line reflects the post-swap state during the animation.
    const previewMat = this._landingPreviewMaterials.get(newHeld);
    if (previewMat && this._landingPreviewMesh) {
      this._landingPreviewMesh.material = previewMat;
    }
    this._landingPreviewColor = newHeld;

    const heldX = layout.shooterX;
    const heldY = layout.shooterY;
    const nextX = layout.nextSlotX;
    const nextY = layout.nextSlotY;
    const heldScale = 1;
    const nextScale = config.nextBubbleRadiusScale;

    this._shooterSwapAnim = {
      age: 0,
      duration: config.shooterSwapDurationSeconds,
      newHeldColor: newHeld,
      newNextColor: newNext,
      heldFromX: heldX,
      heldFromY: heldY,
      heldToX: nextX,
      heldToY: nextY,
      heldFromScale: heldScale,
      heldToScale: nextScale,
      nextFromX: nextX,
      nextFromY: nextY,
      nextToX: heldX,
      nextToY: heldY,
      nextFromScale: nextScale,
      nextToScale: heldScale,
    };
  }

  public updateShooterAnim(dt: number): void {
    const a = this._shooterSwapAnim;
    if (!a) return;
    a.age += dt;
    const t = Math.min(1, a.age / a.duration);
    const heldMesh = this._shooterBubbleMesh;
    const nextMesh = this._nextBubbleMesh;
    if (heldMesh) {
      heldMesh.position.x = a.heldFromX + (a.heldToX - a.heldFromX) * t;
      heldMesh.position.y = a.heldFromY + (a.heldToY - a.heldFromY) * t;
      heldMesh.scale.setScalar(a.heldFromScale + (a.heldToScale - a.heldFromScale) * t);
    }
    if (nextMesh) {
      nextMesh.position.x = a.nextFromX + (a.nextToX - a.nextFromX) * t;
      nextMesh.position.y = a.nextFromY + (a.nextToY - a.nextFromY) * t;
      nextMesh.scale.setScalar(a.nextFromScale + (a.nextToScale - a.nextFromScale) * t);
    }
    if (t >= 1) this._finalizeShooterSwap();
  }

  /**
   * End-of-animation reset: snap meshes back to their slot positions
   * + scales and apply the post-swap materials. Visually invisible
   * because the materials at the swapped positions match what the
   * meshes were already showing one frame earlier.
   */
  private _finalizeShooterSwap(): void {
    const a = this._shooterSwapAnim;
    if (!a) return;
    const heldMesh = this._shooterBubbleMesh;
    const nextMesh = this._nextBubbleMesh;
    if (heldMesh) {
      heldMesh.position.set(a.heldFromX, a.heldFromY, SHOOTER_Z);
      heldMesh.scale.setScalar(a.heldFromScale);
      const mat = this._bubbleMaterials.get(a.newHeldColor);
      if (mat) heldMesh.material = mat;
    }
    if (nextMesh) {
      nextMesh.position.set(a.nextFromX, a.nextFromY, SHOOTER_Z);
      nextMesh.scale.setScalar(a.nextFromScale);
      const mat = this._bubbleMaterials.get(a.newNextColor);
      if (mat) nextMesh.material = mat;
    }
    this._shooterSwapAnim = null;
  }

  public setShooterAimAngle(angle: number): void {
    if (!this._shooterGroup) return;
    // Group's local +y is "forward". Aim angle is measured from world +x,
    // so π/2 means straight up — i.e. zero rotation.
    this._shooterGroup.rotation.z = angle - Math.PI / 2;
  }

  public setAimTrajectory(trajectory: IAimTrajectory): void {
    this._aimSegments = trajectory.segments;
    this._aimSegLengths.length = 0;
    this._aimSegCumLengths.length = 0;
    let total = 0;
    for (const seg of trajectory.segments) {
      const dx = seg.toX - seg.fromX;
      const dy = seg.toY - seg.fromY;
      const len = Math.hypot(dx, dy);
      this._aimSegLengths.push(len);
      total += len;
      this._aimSegCumLengths.push(total);
    }
    this._aimTotalLength = total;
    this._refreshAimDotsAtPhase();
    this._updateLandingPreview(trajectory);
  }

  public updateAimDots(dt: number): void {
    if (this._aimTotalLength <= 0 || !this._config) return;
    const spacing = this._config.aimDotSpacing;
    if (spacing <= 0) return;
    this._aimPhaseOffset = (this._aimPhaseOffset + this._config.aimDotFlowSpeed * dt) % spacing;
    if (this._aimPhaseOffset < 0) this._aimPhaseOffset += spacing;
    this._refreshAimDotsAtPhase();
  }

  public setAimPowerUpMode(active: boolean): void {
    if (this._aimDotPowerUpMode === active) return;
    this._aimDotPowerUpMode = active;
    // Re-paint the active dots with the new material set without
    // disturbing the marching phase.
    this._refreshAimDotsAtPhase();
  }

  public setShooterNextColor(color: BubbleColor | null): void {
    const mesh = this._nextBubbleMesh;
    if (!mesh) return;
    if (color === null) {
      mesh.visible = false;
      return;
    }
    const material = this._bubbleMaterials.get(color);
    if (!material) return;
    mesh.material = material;
    mesh.visible = true;
  }

  public playPopBurst(x: number, y: number, color: BubbleColor): void {
    const config = this._config;
    if (!config || !this._particleGeometry) return;
    const colorHex = BUBBLE_COLOR_HEX[color];
    const count = config.popParticleCount;
    const speedMin = config.popParticleSpeedMin;
    const speedMax = config.popParticleSpeedMax;
    const lifetime = config.popParticleLifetimeSeconds;
    for (let i = 0; i < count; i++) {
      // Even-ish angular distribution with a small per-spawn jitter so
      // bursts don't look mechanical.
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      const particle = this._acquireParticle(colorHex);
      particle.mesh.position.set(x, y, PARTICLE_Z);
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.age = 0;
      particle.lifetime = lifetime;
      particle.material.opacity = 1;
      particle.mesh.visible = true;
      particle.active = true;
    }
  }

  public setFallingBubble(id: number, color: BubbleColor | null, x: number, y: number): void {
    if (color === null) {
      const mesh = this._fallingBubbleMeshes.get(id);
      if (!mesh) return;
      this.remove(mesh);
      this._fallingBubbleMeshes.delete(id);
      return;
    }
    const geometry = this._bubbleGeometry;
    const material = this._bubbleMaterials.get(color);
    if (!geometry || !material) return;
    let mesh = this._fallingBubbleMeshes.get(id);
    if (!mesh) {
      mesh = new THREE.Mesh(geometry, material);
      this._fallingBubbleMeshes.set(id, mesh);
      this.add(mesh);
    }
    mesh.position.set(x, y, 0);
  }

  public updateParticles(dt: number): void {
    for (const p of this._particles) {
      if (!p.active) continue;
      p.age += dt;
      if (p.age >= p.lifetime) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.material.opacity = 1 - p.age / p.lifetime;
    }
  }

  public playScorePopup(x: number, y: number, color: BubbleColor, points: number): void {
    if (points <= 0) return;
    const config = this._config;
    if (!config) return;

    const popup = this._acquireScorePopup();
    if (!popup) return;
    this._renderScorePopupCanvas(popup, color, points);
    popup.mesh.position.set(x, y, SCORE_POPUP_Z);
    popup.material.opacity = 1;
    popup.startY = y;
    popup.rise = config.scorePopupRise;
    popup.age = 0;
    popup.lifetime = config.scorePopupLifetimeSeconds;
    this.add(popup.mesh);
    this._scorePopups.push(popup);
  }

  public updateScorePopups(dt: number): void {
    // Reverse iteration so removals don't disturb the index walk.
    for (let i = this._scorePopups.length - 1; i >= 0; i--) {
      const p = this._scorePopups[i]!;
      p.age += dt;
      if (p.age >= p.lifetime) {
        // Pool the canvas / texture / material / mesh for the next pop
        // so a 19-cell bomb burst doesn't churn 19 GPU textures.
        this.remove(p.mesh);
        this._scorePopups.splice(i, 1);
        this._scorePopupPool.push(p);
        continue;
      }
      const t = p.age / p.lifetime;
      p.mesh.position.y = p.startY + p.rise * t;
      p.material.opacity = 1 - t;
    }
  }

  private _acquireScorePopup(): IScorePopup | null {
    const pooled = this._scorePopupPool.pop();
    if (pooled) return pooled;
    return this._buildScorePopup();
  }

  private _buildScorePopup(): IScorePopup | null {
    const config = this._config;
    if (!config) return null;
    const cw = SCORE_POPUP_CANVAS_W;
    const ch = SCORE_POPUP_CANVAS_H;
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const canvasCtx = canvas.getContext("2d");
    if (!canvasCtx) return null;
    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const planeWidth = config.scorePopupWidth;
    const planeHeight = (planeWidth * ch) / cw;
    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 15;
    return {
      mesh,
      geometry,
      material,
      canvas,
      canvasCtx,
      texture,
      startY: 0,
      rise: 0,
      age: 0,
      lifetime: 0,
    };
  }

  private _renderScorePopupCanvas(popup: IScorePopup, color: BubbleColor, points: number): void {
    const cw = SCORE_POPUP_CANVAS_W;
    const ch = SCORE_POPUP_CANVAS_H;
    const ctx = popup.canvasCtx;
    ctx.clearRect(0, 0, cw, ch);
    const colorHex = BUBBLE_COLOR_HEX[color];
    const r = (colorHex >> 16) & 0xff;
    const g = (colorHex >> 8) & 0xff;
    const b = colorHex & 0xff;
    ctx.font = "bold 52px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
    ctx.lineWidth = 6;
    const text = `+${points}`;
    ctx.strokeText(text, cw / 2, ch / 2);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillText(text, cw / 2, ch / 2);
    popup.texture.needsUpdate = true;
  }

  public setFlyingBomb(active: boolean, x: number, y: number): void {
    if (!this._flyingBombMesh) return;
    if (!active) {
      this._flyingBombMesh.visible = false;
      return;
    }
    this._flyingBombMesh.position.set(x, y, 0);
    this._flyingBombMesh.visible = true;
  }

  public setFireball(active: boolean, x: number, y: number): void {
    if (!this._flyingFireballMesh) return;
    if (!active) {
      this._flyingFireballMesh.visible = false;
      return;
    }
    this._flyingFireballMesh.position.set(x, y, 0);
    this._flyingFireballMesh.visible = true;
  }

  public setFlyingBubble(color: BubbleColor | null, x: number, y: number): void {
    const mesh = this._flyingBubbleMesh;
    if (!mesh) return;
    if (color === null) {
      mesh.visible = false;
      return;
    }
    const material = this._bubbleMaterials.get(color);
    if (!material) return;
    mesh.material = material;
    mesh.position.set(x, y, 0);
    mesh.visible = true;
  }

  public onAimAtWorld(cb: (worldX: number, worldY: number) => void): Unsubscribe {
    this._aimListeners.add(cb);
    return () => this._aimListeners.delete(cb);
  }

  public onFire(cb: () => void): Unsubscribe {
    this._fireListeners.add(cb);
    return () => this._fireListeners.delete(cb);
  }

  public onSwap(cb: () => void): Unsubscribe {
    this._swapListeners.add(cb);
    return () => this._swapListeners.delete(cb);
  }

  private _bubbleKey(row: number, col: number): string {
    return `${row}|${col}`;
  }

  private _buildBackground(width: number, height: number, color: number): void {
    const mat = new THREE.MeshBasicMaterial({ color });
    const geo = new THREE.PlaneGeometry(width, height);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 0, -0.1);
    this._backgroundMesh = mesh;
    this.add(mesh);
  }

  private _buildBorder(width: number, height: number, thickness: number, color: number): void {
    const mat = new THREE.MeshBasicMaterial({ color });
    const halfW = width / 2;
    const halfH = height / 2;
    const t = thickness;

    const make = (w: number, h: number, x: number, y: number): void => {
      const geo = new THREE.PlaneGeometry(w, h);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, -0.05);
      this._borderMeshes.push(mesh);
      this.add(mesh);
    };

    make(width + t * 2, t, 0, halfH + t / 2);
    make(width + t * 2, t, 0, -halfH - t / 2);
    make(t, height, -halfW - t / 2, 0);
    make(t, height, halfW + t / 2, 0);
  }

  private _buildCellOutlines(
    gridLeftX: number,
    gridTopY: number,
    layout: BubbleGridLayout,
    config: BubbleShooterConfig,
  ): void {
    const r = layout.bubbleRadius;
    const inner = Math.max(0, r - config.cellOutlineThickness);
    const ringGeo = new THREE.RingGeometry(inner, r, CELL_RING_SEGMENTS);
    const ringMat = new THREE.MeshBasicMaterial({ color: config.cellOutlineColor, side: THREE.DoubleSide });

    for (let row = 0; row < layout.rowCount; row++) {
      const colCount = layout.getColumnCount(row);
      for (let col = 0; col < colCount; col++) {
        const local = layout.getCellLocalPosition(row, col);
        const mesh = new THREE.Mesh(ringGeo, ringMat);
        mesh.position.set(gridLeftX + local.x, gridTopY - local.y, 0);
        this._cellMeshes.push(mesh);
        this.add(mesh);
      }
    }
  }

  private _buildBubbleResources(bubbleRadius: number): void {
    // Bubbles are flat disc billboards textured with the per-colour SVG
    // sprite shipped under `assets/bubbles/`. With a Front2D camera the
    // disc reads as a 3D bubble thanks to the baked highlight + rim
    // gradient. Textures are owned by AssetManager — the view only owns
    // the materials.
    this._bubbleGeometry = new THREE.CircleGeometry(bubbleRadius * BUBBLE_VISUAL_RADIUS_FACTOR, BUBBLE_DISC_SEGMENTS);
    for (const color of ALL_BUBBLE_COLORS) {
      const assetId = BUBBLE_COLOR_TO_ASSET_ID[color];
      const tex = this.assetLoader.getAsset<THREE.Texture>(assetId);
      if (tex) {
        this._bubbleMaterials.set(
          color,
          new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
        );
      } else {
        // Asset failed to load — fall back to a solid-colour disc so the
        // game still renders rather than going invisible.
        this._bubbleMaterials.set(
          color,
          new THREE.MeshBasicMaterial({ color: BUBBLE_COLOR_HEX[color], transparent: true, depthWrite: false }),
        );
      }
    }
  }

  private _buildShooter(config: BubbleShooterConfig, layout: BubbleGridLayout): void {
    const group = new THREE.Group();
    group.position.set(layout.shooterX, layout.shooterY, SHOOTER_Z);
    this._shooterGroup = group;
    this.add(group);

    // Outer ring: thin annulus.
    const ringInner = config.shooterRadius - config.shooterRingThickness;
    const ringGeo = new THREE.RingGeometry(ringInner, config.shooterRadius, SHOOTER_RING_SEGMENTS);
    const ringMat = new THREE.MeshBasicMaterial({ color: config.shooterRingColor, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(0, 0, 0);
    this._shooterRingMesh = ring;
    group.add(ring);

    // Barrel: thin rectangle protruding "forward" (local +y) from the ring.
    // Sits half inside, half outside the ring so it reads as a turret.
    const barrelGeo = new THREE.PlaneGeometry(config.shooterBarrelThickness, config.shooterBarrelLength);
    const barrelMat = new THREE.MeshBasicMaterial({ color: config.shooterBarrelColor });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.position.set(0, config.shooterRadius * 0.5 + config.shooterBarrelLength * 0.4, 0);
    this._shooterBarrelMesh = barrel;
    group.add(barrel);

    // Held bubble: centred on the shooter, attached *outside* the
    // rotating group so the procedural highlight stays in the upper-left
    // regardless of aim. Material is swapped via setShooterHeldColor;
    // default to the first palette entry until the controller calls in.
    const placeholder = this._bubbleMaterials.get(BUBBLE_COLORS[0]!);
    const bubbleGeo = this._bubbleGeometry;
    if (bubbleGeo && placeholder) {
      const bubble = new THREE.Mesh(bubbleGeo, placeholder);
      bubble.position.set(layout.shooterX, layout.shooterY, SHOOTER_Z);
      this._shooterBubbleMesh = bubble;
      this.add(bubble);
    }
  }

  private _buildAimDotResources(config: BubbleShooterConfig): void {
    this._aimDotGeometry = new THREE.CircleGeometry(config.aimDotRadius, AIM_DOT_SEGMENTS);
    this._aimDotMaterial = this._createAimDotMaterial(config.aimDotColor, config.aimDotAlpha);
    this._aimDotMaterialPowerUp = this._createAimDotMaterial(config.aimDotPowerUpColor, config.aimDotAlpha);
    const K = Math.max(0, config.aimDotFadeTailCount);
    for (let i = 0; i < K; i++) {
      // i = 0 is the last dot (most faded); ramp linearly up to K/(K+1)
      // for the K-th-from-end so the gradient reads as smooth.
      const factor = (i + 1) / (K + 1);
      this._aimDotFadeMaterials.push(this._createAimDotMaterial(config.aimDotColor, config.aimDotAlpha * factor));
      this._aimDotFadeMaterialsPowerUp.push(this._createAimDotMaterial(config.aimDotPowerUpColor, config.aimDotAlpha * factor));
    }
  }

  private _createAimDotMaterial(color: number, opacity: number): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthTest: false,
      depthWrite: false,
    });
  }

  private _buildLandingPreview(config: BubbleShooterConfig): void {
    // Outline-only ghost: a thin ring matching the bubble's outer radius.
    const outer = config.bubbleRadius * BUBBLE_VISUAL_RADIUS_FACTOR;
    const inner = Math.max(0, outer - config.landingPreviewRingThickness);
    this._landingPreviewGeometry = new THREE.RingGeometry(inner, outer, LANDING_PREVIEW_SEGMENTS);
    for (const color of BUBBLE_COLORS) {
      this._landingPreviewMaterials.set(
        color,
        new THREE.MeshBasicMaterial({
          color: BUBBLE_COLOR_HEX[color],
          transparent: true,
          opacity: config.landingPreviewOpacity,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
    }
    const initial = this._landingPreviewMaterials.get(BUBBLE_COLORS[0]!)!;
    const mesh = new THREE.Mesh(this._landingPreviewGeometry, initial);
    mesh.visible = false;
    this._landingPreviewMesh = mesh;
    this.add(mesh);
  }

  private _updateLandingPreview(trajectory: IAimTrajectory): void {
    const mesh = this._landingPreviewMesh;
    if (!mesh) return;
    const landing = trajectory.landing;
    if (!landing) {
      mesh.visible = false;
      return;
    }
    mesh.position.set(landing.worldX, landing.worldY, 0);
    mesh.visible = true;
  }

  private _buildNextSlot(config: BubbleShooterConfig, layout: BubbleGridLayout): void {
    // Swap-icon plane: refresh-style two-arrow ring framing the next
    // bubble, so the slot reads as the swap affordance.
    const iconTex = this.assetLoader.getAsset<THREE.Texture>(BubbleShooterAssetIds.SwapIcon);
    const iconGeo = new THREE.PlaneGeometry(config.nextSlotIconSize, config.nextSlotIconSize);
    const iconMat = iconTex
      ? new THREE.MeshBasicMaterial({ map: iconTex, transparent: true, depthWrite: false })
      : new THREE.MeshBasicMaterial({ color: 0x6b86a8, transparent: true, opacity: 0.6, depthWrite: false });
    const icon = new THREE.Mesh(iconGeo, iconMat);
    // Slightly behind the bubble so the bubble disc draws on top.
    icon.position.set(layout.nextSlotX, layout.nextSlotY, SHOOTER_Z - 0.05);
    this._nextSlotIconMesh = icon;
    this.add(icon);

    if (!this._bubbleGeometry) return;
    const placeholder = this._bubbleMaterials.get(BUBBLE_COLORS[0]!);
    if (!placeholder) return;
    const bubble = new THREE.Mesh(this._bubbleGeometry, placeholder);
    bubble.scale.setScalar(config.nextBubbleRadiusScale);
    bubble.position.set(layout.nextSlotX, layout.nextSlotY, SHOOTER_Z);
    bubble.visible = false;
    this._nextBubbleMesh = bubble;
    this.add(bubble);
  }

  private _buildBombResources(layout: BubbleGridLayout): void {
    if (!this._bubbleGeometry) return;
    const tex = this.assetLoader.getAsset<THREE.Texture>(BubbleShooterAssetIds.BombBubble);
    this._bombMaterial = tex
      ? new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
      : new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, depthWrite: false });

    const heldBomb = new THREE.Mesh(this._bubbleGeometry, this._bombMaterial);
    heldBomb.position.set(layout.shooterX, layout.shooterY, SHOOTER_Z);
    heldBomb.visible = false;
    this._shooterBombMesh = heldBomb;
    this.add(heldBomb);

    const flyingBomb = new THREE.Mesh(this._bubbleGeometry, this._bombMaterial);
    flyingBomb.visible = false;
    this._flyingBombMesh = flyingBomb;
    this.add(flyingBomb);
  }

  private _buildFireballResources(layout: BubbleGridLayout): void {
    if (!this._bubbleGeometry) return;
    const tex = this.assetLoader.getAsset<THREE.Texture>(BubbleShooterAssetIds.FireballBubble);
    this._fireballMaterial = tex
      ? new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
      : new THREE.MeshBasicMaterial({ color: 0xff5522, transparent: true, depthWrite: false });

    const heldFireball = new THREE.Mesh(this._bubbleGeometry, this._fireballMaterial);
    heldFireball.position.set(layout.shooterX, layout.shooterY, SHOOTER_Z);
    heldFireball.visible = false;
    this._shooterFireballMesh = heldFireball;
    this.add(heldFireball);

    const flyingFireball = new THREE.Mesh(this._bubbleGeometry, this._fireballMaterial);
    flyingFireball.visible = false;
    this._flyingFireballMesh = flyingFireball;
    this.add(flyingFireball);
  }

  private _buildParticleResources(config: BubbleShooterConfig): void {
    this._particleGeometry = new THREE.CircleGeometry(config.popParticleRadius, PARTICLE_SEGMENTS);
  }

  private _acquireParticle(colorHex: number): IPopParticle {
    // Reuse an inactive particle if available; recolor + recycle.
    for (const p of this._particles) {
      if (!p.active) {
        p.material.color.setHex(colorHex);
        return p;
      }
    }
    const material = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 1,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(this._particleGeometry!, material);
    mesh.renderOrder = 12;
    mesh.visible = false;
    this.add(mesh);
    const particle: IPopParticle = { mesh, material, vx: 0, vy: 0, age: 0, lifetime: 0, active: false };
    this._particles.push(particle);
    return particle;
  }

  private _buildFlyingBubble(): void {
    if (!this._bubbleGeometry) return;
    const initial = this._bubbleMaterials.get(BUBBLE_COLORS[0]!);
    if (!initial) return;
    const mesh = new THREE.Mesh(this._bubbleGeometry, initial);
    mesh.visible = false;
    this._flyingBubbleMesh = mesh;
    this.add(mesh);
  }

  /**
   * Place dots at arc-length positions `phase, phase + spacing, ...` until
   * the trajectory's end. Reflections fall out for free — the arc-length
   * walker maps any `s` through the segment list to a world point, so the
   * dots flow smoothly through bounce points without special-casing.
   *
   * Materials are assigned by distance-from-end: the last K dots fade
   * (closest to landing = most faded), everyone else uses full opacity.
   * As dots advance through the marching animation, each one passes
   * through the tail materials in sequence so the fade reads as smooth.
   */
  private _refreshAimDotsAtPhase(): void {
    this._hideAllAimDots();
    if (!this._config || !this._aimDotGeometry || !this._aimDotMaterial) return;
    if (this._aimTotalLength <= 0) return;
    const spacing = this._config.aimDotSpacing;

    const positions: { x: number; y: number }[] = [];
    for (let s = this._aimPhaseOffset; s < this._aimTotalLength; s += spacing) {
      const pos = this._arcLengthToWorldPoint(s);
      if (pos) positions.push(pos);
    }

    const total = positions.length;
    const fullMat = this._aimDotPowerUpMode ? this._aimDotMaterialPowerUp : this._aimDotMaterial;
    const fadeMats = this._aimDotPowerUpMode ? this._aimDotFadeMaterialsPowerUp : this._aimDotFadeMaterials;
    if (!fullMat) return;
    const fadeCount = fadeMats.length;
    for (let i = 0; i < total; i++) {
      const dot = this._acquireAimDot();
      dot.position.set(positions[i]!.x, positions[i]!.y, AIM_DOT_Z);
      const tailIndex = total - 1 - i;
      dot.material = tailIndex < fadeCount ? fadeMats[tailIndex]! : fullMat;
      dot.visible = true;
    }
  }

  private _arcLengthToWorldPoint(s: number): { x: number; y: number } | null {
    for (let i = 0; i < this._aimSegments.length; i++) {
      const cumEnd = this._aimSegCumLengths[i]!;
      if (s <= cumEnd) {
        const segLen = this._aimSegLengths[i]!;
        const segStart = i === 0 ? 0 : this._aimSegCumLengths[i - 1]!;
        const t = segLen === 0 ? 0 : (s - segStart) / segLen;
        const seg = this._aimSegments[i]!;
        return {
          x: seg.fromX + (seg.toX - seg.fromX) * t,
          y: seg.fromY + (seg.toY - seg.fromY) * t,
        };
      }
    }
    return null;
  }

  private _acquireAimDot(): THREE.Mesh {
    if (this._activeAimDots < this._aimDotPool.length) {
      const dot = this._aimDotPool[this._activeAimDots]!;
      this._activeAimDots++;
      return dot;
    }
    const dot = new THREE.Mesh(this._aimDotGeometry!, this._aimDotMaterial!);
    dot.renderOrder = 10;
    this.add(dot);
    this._aimDotPool.push(dot);
    this._activeAimDots++;
    return dot;
  }

  private _hideAllAimDots(): void {
    for (let i = 0; i < this._activeAimDots; i++) {
      this._aimDotPool[i]!.visible = false;
    }
    this._activeAimDots = 0;
  }

  private _attachPointerListener(): void {
    if (!this._world) return;
    this._canvasEl = this._world.renderer.domElement;
    // Pixi's HUD canvas is layered on top of the WebGL canvas, so pointer
    // events go to it — not to the WebGL canvas. Listen on the shared
    // mount/parent so we catch events bubbling from either canvas.
    this._pointerEventTarget = this._canvasEl.parentElement ?? this._canvasEl;
    this._pointerEventTarget.addEventListener("pointermove", this._onPointerMove);
    this._pointerEventTarget.addEventListener("pointerdown", this._onPointerDown);
    this._pointerEventTarget.addEventListener("contextmenu", this._onContextMenu);
  }

  private readonly _onPointerMove = (event: PointerEvent): void => {
    const world = this._eventToWorld(event);
    if (!world) return;
    for (const cb of this._aimListeners) cb(world.x, world.y);
  };

  private readonly _onPointerDown = (event: PointerEvent): void => {
    if (event.button === 2) {
      for (const cb of this._swapListeners) cb();
      return;
    }
    if (event.button !== 0) return;
    // Left-click on the next-slot icon also triggers swap.
    const world = this._eventToWorld(event);
    if (world && this._isOverNextSlot(world.x, world.y)) {
      for (const cb of this._swapListeners) cb();
      return;
    }
    for (const cb of this._fireListeners) cb();
  };

  private _eventToWorld(event: MouseEvent): { x: number; y: number } | null {
    const world = this._world;
    if (!world || !this._canvasEl) return null;
    const camera = world.activeCamera;
    if (!camera) return null;
    const rect = this._canvasEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    const v = new THREE.Vector3(ndcX, ndcY, 0).unproject(camera);
    return { x: v.x, y: v.y };
  }

  private _isOverNextSlot(worldX: number, worldY: number): boolean {
    const layout = this._layout;
    const config = this._config;
    if (!layout || !config) return false;
    const dx = worldX - layout.nextSlotX;
    const dy = worldY - layout.nextSlotY;
    const r = config.nextSlotClickRadius;
    return dx * dx + dy * dy <= r * r;
  }

  private readonly _onContextMenu = (event: MouseEvent): void => {
    // Suppress the browser context menu so right-click can drive swap.
    event.preventDefault();
  };

  public override preDestroy(): void {
    if (this._pointerEventTarget) {
      this._pointerEventTarget.removeEventListener("pointermove", this._onPointerMove);
      this._pointerEventTarget.removeEventListener("pointerdown", this._onPointerDown);
      this._pointerEventTarget.removeEventListener("contextmenu", this._onContextMenu);
      this._pointerEventTarget = null;
    }
    this._canvasEl = null;
    this._aimListeners.clear();
    this._fireListeners.clear();
    this._swapListeners.clear();

    if (this._nextBubbleMesh) {
      this.remove(this._nextBubbleMesh);
      this._nextBubbleMesh = null;
    }
    if (this._nextSlotIconMesh) {
      this.remove(this._nextSlotIconMesh);
      this._nextSlotIconMesh.geometry.dispose();
      (this._nextSlotIconMesh.material as THREE.MeshBasicMaterial).dispose();
      this._nextSlotIconMesh = null;
    }

    if (this._flyingBubbleMesh) {
      this.remove(this._flyingBubbleMesh);
      this._flyingBubbleMesh = null;
    }

    if (this._shooterBombMesh) {
      this.remove(this._shooterBombMesh);
      this._shooterBombMesh = null;
    }
    if (this._flyingBombMesh) {
      this.remove(this._flyingBombMesh);
      this._flyingBombMesh = null;
    }
    if (this._bombMaterial) {
      this._bombMaterial.dispose();
      this._bombMaterial = null;
    }

    if (this._shooterFireballMesh) {
      this.remove(this._shooterFireballMesh);
      this._shooterFireballMesh = null;
    }
    if (this._flyingFireballMesh) {
      this.remove(this._flyingFireballMesh);
      this._flyingFireballMesh = null;
    }
    if (this._fireballMaterial) {
      this._fireballMaterial.dispose();
      this._fireballMaterial = null;
    }

    for (const mesh of this._fallingBubbleMeshes.values()) this.remove(mesh);
    this._fallingBubbleMeshes.clear();

    for (const p of this._particles) {
      this.remove(p.mesh);
      p.material.dispose();
    }
    this._particles.length = 0;
    this._particleGeometry?.dispose();
    this._particleGeometry = null;

    for (const p of this._scorePopups) {
      this.remove(p.mesh);
      p.geometry.dispose();
      p.material.dispose();
      p.texture.dispose();
    }
    this._scorePopups.length = 0;
    for (const p of this._scorePopupPool) {
      p.geometry.dispose();
      p.material.dispose();
      p.texture.dispose();
    }
    this._scorePopupPool.length = 0;
    this._shooterSwapAnim = null;

    for (const dot of this._aimDotPool) this.remove(dot);
    this._aimDotPool.length = 0;
    this._activeAimDots = 0;
    this._aimDotGeometry?.dispose();
    this._aimDotGeometry = null;
    this._aimDotMaterial?.dispose();
    this._aimDotMaterial = null;
    for (const mat of this._aimDotFadeMaterials) mat.dispose();
    this._aimDotFadeMaterials.length = 0;
    this._aimDotMaterialPowerUp?.dispose();
    this._aimDotMaterialPowerUp = null;
    for (const mat of this._aimDotFadeMaterialsPowerUp) mat.dispose();
    this._aimDotFadeMaterialsPowerUp.length = 0;

    if (this._landingPreviewMesh) {
      this.remove(this._landingPreviewMesh);
      this._landingPreviewMesh = null;
    }
    this._landingPreviewGeometry?.dispose();
    this._landingPreviewGeometry = null;
    for (const mat of this._landingPreviewMaterials.values()) mat.dispose();
    this._landingPreviewMaterials.clear();
    this._landingPreviewColor = null;

    if (this._shooterGroup) {
      this.remove(this._shooterGroup);
      this._shooterGroup = null;
    }
    if (this._shooterRingMesh) {
      this._shooterRingMesh.geometry.dispose();
      (this._shooterRingMesh.material as THREE.MeshBasicMaterial).dispose();
      this._shooterRingMesh = null;
    }
    if (this._shooterBarrelMesh) {
      this._shooterBarrelMesh.geometry.dispose();
      (this._shooterBarrelMesh.material as THREE.MeshBasicMaterial).dispose();
      this._shooterBarrelMesh = null;
    }
    this._shooterBubbleMesh = null;

    for (const mesh of this._bubbleMeshes.values()) this.remove(mesh);
    this._bubbleMeshes.clear();
    this._bubbleGeometry?.dispose();
    this._bubbleGeometry = null;
    for (const mat of this._bubbleMaterials.values()) mat.dispose();
    this._bubbleMaterials.clear();
    // Textures are owned by AssetManager; do not dispose here.

    for (const mesh of this._cellMeshes) this.remove(mesh);
    if (this._cellMeshes.length > 0) {
      this._cellMeshes[0]!.geometry.dispose();
      (this._cellMeshes[0]!.material as THREE.MeshBasicMaterial).dispose();
    }
    this._cellMeshes.length = 0;

    for (const mesh of this._borderMeshes) {
      this.remove(mesh);
      mesh.geometry.dispose();
    }
    if (this._borderMeshes.length > 0) {
      (this._borderMeshes[0]!.material as THREE.MeshBasicMaterial).dispose();
    }
    this._borderMeshes.length = 0;

    if (this._backgroundMesh) {
      this.remove(this._backgroundMesh);
      this._backgroundMesh.geometry.dispose();
      (this._backgroundMesh.material as THREE.MeshBasicMaterial).dispose();
      this._backgroundMesh = null;
    }

    if (this._world) {
      this._world.scene.fog = this._previousSceneFog;
    }
    this._previousSceneFog = null;
    this._world = null;
    this._config = null;
    this._layout = null;
  }
}
