import * as THREE from "three";
import { WorldViewBase, World, type IInstanceResolver, type Unsubscribe } from "@gamebyte/gamelabsjs";
import type { IGameAreaView } from "./IGameAreaView";
import { BubbleShooterConfig } from "../BubbleShooterConfig";
import { BubbleGridLayout } from "../utilities/BubbleGridLayout";
import type { IAimTrajectory, IAimTrajectorySegment } from "../utilities/AimTrajectoryCalculator";
import { BUBBLE_COLOR_HEX, BUBBLE_COLORS, type BubbleColor } from "../constants/BubbleColor";
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

interface IPopParticle {
  readonly mesh: THREE.Mesh;
  readonly material: THREE.MeshBasicMaterial;
  vx: number;
  vy: number;
  age: number;
  lifetime: number;
  active: boolean;
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

  /** Live falling-bubble meshes keyed by ops-side falling-bubble id. */
  private readonly _fallingBubbleMeshes = new Map<number, THREE.Mesh>();

  private _particleGeometry: THREE.CircleGeometry | null = null;
  private readonly _particles: IPopParticle[] = [];

  private _nextSlotIconMesh: THREE.Mesh | null = null;
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

    this._buildBubbleResources(layout.bubbleRadius);
    this._buildShooter(config, layout);
    this._buildNextSlot(config, layout);
    this._buildAimDotResources(config);
    this._buildLandingPreview(config);
    this._buildFlyingBubble();
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
    for (const color of BUBBLE_COLORS) {
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
    const K = Math.max(0, config.aimDotFadeTailCount);
    for (let i = 0; i < K; i++) {
      // i = 0 is the last dot (most faded); ramp linearly up to K/(K+1)
      // for the K-th-from-end so the gradient reads as smooth.
      const factor = (i + 1) / (K + 1);
      this._aimDotFadeMaterials.push(this._createAimDotMaterial(config.aimDotColor, config.aimDotAlpha * factor));
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
    const fadeCount = this._aimDotFadeMaterials.length;
    for (let i = 0; i < total; i++) {
      const dot = this._acquireAimDot();
      dot.position.set(positions[i]!.x, positions[i]!.y, AIM_DOT_Z);
      const tailIndex = total - 1 - i;
      dot.material = tailIndex < fadeCount ? this._aimDotFadeMaterials[tailIndex]! : this._aimDotMaterial;
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

    for (const mesh of this._fallingBubbleMeshes.values()) this.remove(mesh);
    this._fallingBubbleMeshes.clear();

    for (const p of this._particles) {
      this.remove(p.mesh);
      p.material.dispose();
    }
    this._particles.length = 0;
    this._particleGeometry?.dispose();
    this._particleGeometry = null;

    for (const dot of this._aimDotPool) this.remove(dot);
    this._aimDotPool.length = 0;
    this._activeAimDots = 0;
    this._aimDotGeometry?.dispose();
    this._aimDotGeometry = null;
    this._aimDotMaterial?.dispose();
    this._aimDotMaterial = null;
    for (const mat of this._aimDotFadeMaterials) mat.dispose();
    this._aimDotFadeMaterials.length = 0;

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
