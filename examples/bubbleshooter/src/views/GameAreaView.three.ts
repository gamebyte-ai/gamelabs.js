import * as THREE from "three";
import { WorldViewBase, World, type IInstanceResolver, type Unsubscribe } from "@gamebyte/gamelabsjs";
import type { IGameAreaView } from "./IGameAreaView";
import { BubbleShooterConfig } from "../BubbleShooterConfig";
import { BubbleGridLayout } from "../utilities/BubbleGridLayout";
import type { IAimTrajectory, IAimTrajectorySegment } from "../utilities/AimTrajectoryCalculator";
import { BUBBLE_COLOR_HEX, BUBBLE_COLORS, type BubbleColor } from "../constants/BubbleColor";

const CELL_RING_SEGMENTS = 32;
const SHOOTER_RING_SEGMENTS = 48;
const AIM_DOT_SEGMENTS = 14;
const SPHERE_WIDTH_SEGMENTS = 24;
const SPHERE_HEIGHT_SEGMENTS = 18;
const BUBBLE_VISUAL_RADIUS_FACTOR = 0.94;
const SHOOTER_Z = 0.2;
const AIM_DOT_Z = 0.4;

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

  private _ambientLight: THREE.AmbientLight | null = null;
  private _directionalLight: THREE.DirectionalLight | null = null;
  private _bubbleGeometry: THREE.SphereGeometry | null = null;
  private readonly _bubbleMaterials = new Map<BubbleColor, THREE.MeshLambertMaterial>();
  private readonly _bubbleMeshes = new Map<string, THREE.Mesh>();

  private _shooterGroup: THREE.Group | null = null;
  private _shooterRingMesh: THREE.Mesh | null = null;
  private _shooterBarrelMesh: THREE.Mesh | null = null;
  private _shooterBubbleMesh: THREE.Mesh | null = null;

  private _aimDotGeometry: THREE.CircleGeometry | null = null;
  private _aimDotMaterial: THREE.MeshBasicMaterial | null = null;
  private readonly _aimDotPool: THREE.Mesh[] = [];
  private _activeAimDots = 0;

  private _aimSegments: readonly IAimTrajectorySegment[] = [];
  private readonly _aimSegLengths: number[] = [];
  private readonly _aimSegCumLengths: number[] = [];
  private _aimTotalLength = 0;
  /** Persistent phase offset in [0, spacing); preserved across trajectory
   *  re-emits so the dot stream keeps marching when the player re-aims. */
  private _aimPhaseOffset = 0;

  private _landingPreviewMesh: THREE.Mesh | null = null;
  private readonly _landingPreviewMaterials = new Map<BubbleColor, THREE.MeshLambertMaterial>();
  private _landingPreviewColor: BubbleColor | null = null;

  private _flyingBubbleMesh: THREE.Mesh | null = null;

  private _nextSlotRingMesh: THREE.Mesh | null = null;
  private _nextBubbleMesh: THREE.Mesh | null = null;

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

    this._buildLights();
    this._buildBubbleResources(layout.bubbleRadius);
    this._buildShooter(config, layout);
    this._buildNextSlot(config, layout);
    this._buildAimDotResources(config);
    this._buildLandingPreview(config);
    this._buildFlyingBubble();
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

  private _buildLights(): void {
    this._ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    this.add(this._ambientLight);

    this._directionalLight = new THREE.DirectionalLight(0xffffff, 0.85);
    this._directionalLight.position.set(-0.6, 0.8, 1);
    this.add(this._directionalLight);
  }

  private _buildBubbleResources(bubbleRadius: number): void {
    this._bubbleGeometry = new THREE.SphereGeometry(
      bubbleRadius * BUBBLE_VISUAL_RADIUS_FACTOR,
      SPHERE_WIDTH_SEGMENTS,
      SPHERE_HEIGHT_SEGMENTS,
    );
    for (const color of BUBBLE_COLORS) {
      this._bubbleMaterials.set(color, new THREE.MeshLambertMaterial({ color: BUBBLE_COLOR_HEX[color] }));
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

    // Held bubble: centred on the shooter. Material is swapped via
    // setShooterHeldColor; default to the first palette entry until the
    // controller calls in with the loaded colour.
    const placeholder = this._bubbleMaterials.get(BUBBLE_COLORS[0]!) ?? new THREE.MeshLambertMaterial({ color: 0xffffff });
    const bubbleGeo = this._bubbleGeometry;
    if (bubbleGeo) {
      const bubble = new THREE.Mesh(bubbleGeo, placeholder);
      bubble.position.set(0, 0, 0);
      this._shooterBubbleMesh = bubble;
      group.add(bubble);
    }
  }

  private _buildAimDotResources(config: BubbleShooterConfig): void {
    this._aimDotGeometry = new THREE.CircleGeometry(config.aimDotRadius, AIM_DOT_SEGMENTS);
    this._aimDotMaterial = new THREE.MeshBasicMaterial({
      color: config.aimDotColor,
      transparent: true,
      opacity: config.aimDotAlpha,
      depthTest: false,
      depthWrite: false,
    });
  }

  private _buildLandingPreview(config: BubbleShooterConfig): void {
    if (!this._bubbleGeometry) return;
    for (const color of BUBBLE_COLORS) {
      this._landingPreviewMaterials.set(
        color,
        new THREE.MeshLambertMaterial({
          color: BUBBLE_COLOR_HEX[color],
          transparent: true,
          opacity: config.landingPreviewOpacity,
          depthWrite: false,
        }),
      );
    }
    const initial = this._landingPreviewMaterials.get(BUBBLE_COLORS[0]!)!;
    const mesh = new THREE.Mesh(this._bubbleGeometry, initial);
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
    const ringInner = config.nextSlotRadius - config.nextSlotRingThickness;
    const ringGeo = new THREE.RingGeometry(ringInner, config.nextSlotRadius, SHOOTER_RING_SEGMENTS);
    const ringMat = new THREE.MeshBasicMaterial({ color: config.nextSlotRingColor, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(layout.nextSlotX, layout.nextSlotY, SHOOTER_Z);
    this._nextSlotRingMesh = ring;
    this.add(ring);

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
   */
  private _refreshAimDotsAtPhase(): void {
    this._hideAllAimDots();
    if (!this._config || !this._aimDotGeometry || !this._aimDotMaterial) return;
    if (this._aimTotalLength <= 0) return;
    const spacing = this._config.aimDotSpacing;
    for (let s = this._aimPhaseOffset; s < this._aimTotalLength; s += spacing) {
      const pos = this._arcLengthToWorldPoint(s);
      if (!pos) continue;
      const dot = this._acquireAimDot();
      dot.position.set(pos.x, pos.y, AIM_DOT_Z);
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
    const world = this._world;
    if (!world || !this._canvasEl) return;
    const camera = world.activeCamera;
    if (!camera) return;
    const rect = this._canvasEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    const v = new THREE.Vector3(ndcX, ndcY, 0).unproject(camera);
    for (const cb of this._aimListeners) cb(v.x, v.y);
  };

  private readonly _onPointerDown = (event: PointerEvent): void => {
    if (event.button === 0) {
      for (const cb of this._fireListeners) cb();
    } else if (event.button === 2) {
      for (const cb of this._swapListeners) cb();
    }
  };

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
    if (this._nextSlotRingMesh) {
      this.remove(this._nextSlotRingMesh);
      this._nextSlotRingMesh.geometry.dispose();
      (this._nextSlotRingMesh.material as THREE.MeshBasicMaterial).dispose();
      this._nextSlotRingMesh = null;
    }

    if (this._flyingBubbleMesh) {
      this.remove(this._flyingBubbleMesh);
      this._flyingBubbleMesh = null;
    }

    for (const dot of this._aimDotPool) this.remove(dot);
    this._aimDotPool.length = 0;
    this._activeAimDots = 0;
    this._aimDotGeometry?.dispose();
    this._aimDotGeometry = null;
    this._aimDotMaterial?.dispose();
    this._aimDotMaterial = null;

    if (this._landingPreviewMesh) {
      this.remove(this._landingPreviewMesh);
      this._landingPreviewMesh = null;
    }
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

    if (this._directionalLight) {
      this.remove(this._directionalLight);
      this._directionalLight = null;
    }
    if (this._ambientLight) {
      this.remove(this._ambientLight);
      this._ambientLight = null;
    }

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
