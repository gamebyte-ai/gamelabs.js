import * as THREE from "three";
import gsap from "gsap";
import {
  World,
  WorldViewBase,
  type IInstanceResolver,
  type IPointerInputHandler,
  type Unsubscribe,
} from "@gamebyte/gamelabsjs";
import { ColorBlockJamConfig, type DoorSide } from "../ColorBlockJamConfig.js";
import type { Block } from "../models/Block.js";
import type { Door } from "../models/Door.js";
import type { GridPointer, IBoardView } from "./IBoardView.js";

type BlockRecord = {
  readonly id: number;
  readonly block: Block;
  readonly group: THREE.Group;
  /**
   * All meshes the raycaster can hit to select this block. The Lego body
   * is one extruded piece; the studs sit on top. Any of them selecting
   * the block's id on pointer-down.
   */
  readonly pickableMeshes: THREE.Mesh[];
  /** Per-block geometry — needs explicit dispose on remove. */
  readonly bodyGeometry: THREE.BufferGeometry;
  readonly material: THREE.MeshStandardMaterial;
  readonly baseY: number;
  /**
   * True once the exit animation has been started. Prevents the raycaster
   * from picking the mesh again and double-triggering an exit.
   */
  isExiting: boolean;
};

export class BoardView extends WorldViewBase implements IBoardView, IPointerInputHandler {
  private _config: ColorBlockJamConfig | null = null;
  private _world: World | null = null;

  /**
   * Grid dimensions for the level the board is currently rendering. Set
   * by {@link buildBoard}; used for cell positioning and pointer
   * projection regardless of which config level is active.
   */
  private _cols = 0;
  private _rows = 0;

  private _gridPlate: THREE.Mesh | null = null;
  private _gridPlateMaterial: THREE.MeshStandardMaterial | null = null;
  private _gridPlateGeometry: THREE.BoxGeometry | null = null;
  /** One merged LineSegments mesh drawing every grid boundary in a single pass. */
  private _gridOverlay: THREE.LineSegments | null = null;
  private _gridOverlayGeometry: THREE.BufferGeometry | null = null;
  private _gridOverlayMaterial: THREE.LineBasicMaterial | null = null;

  /** Extra key light added to brighten the studs. */
  private _keyLight: THREE.DirectionalLight | null = null;

  private readonly _doorMeshes: THREE.Mesh[] = [];
  private readonly _doorMaterials: THREE.MeshStandardMaterial[] = [];
  private readonly _doorGeometries: THREE.BufferGeometry[] = [];

  private readonly _blocks = new Map<number, BlockRecord>();
  /** Shared stud geometry — one cylinder for every block on the board. */
  private _studGeometry: THREE.CylinderGeometry | null = null;

  private _draggedBlockId: number | null = null;
  private _activePointerId: number | null = null;

  private readonly _pickListeners = new Set<(blockId: number, pointer: GridPointer) => void>();
  private readonly _moveListeners = new Set<(pointer: GridPointer) => void>();
  private readonly _upListeners = new Set<(pointer: GridPointer) => void>();

  private readonly _raycaster = new THREE.Raycaster();
  private readonly _ndc = new THREE.Vector2();
  private readonly _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly _planeHit = new THREE.Vector3();

  private readonly _activeTimelines = new Set<gsap.core.Timeline>();

  private _skyTexture: THREE.CanvasTexture | null = null;
  private _priorBackground: THREE.Scene["background"] = null;
  private _priorFog: THREE.Scene["fog"] = null;

  public override inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._config = resolver.getInstance(ColorBlockJamConfig);
    this._world = resolver.getInstance(World);
  }

  public override postInitialize(): void {
    super.postInitialize();
    this._installSkyGradient();
    this._installKeyLight();
  }

  /**
   * Adds a warm, angled directional light so the Lego studs read as 3D.
   * The framework's scene already has an ambient + overhead directional,
   * which are broad and flat; this extra light comes from upper-front
   * so each stud casts a short lateral highlight. Disposed in preDestroy.
   */
  private _installKeyLight(): void {
    if (!this._world) return;
    const light = new THREE.DirectionalLight(0xfff4d6, 1.1);
    light.position.set(-3, 8, -2);
    light.target.position.set(0, 0, 0);
    this._world.scene.add(light);
    this._world.scene.add(light.target);
    this._keyLight = light;
  }

  private _uninstallKeyLight(): void {
    if (!this._world || !this._keyLight) return;
    this._world.scene.remove(this._keyLight);
    this._world.scene.remove(this._keyLight.target);
    this._keyLight = null;
  }

  /**
   * Swaps the shared scene's dark background for a light-orange→deep-blue
   * vertical gradient rendered from a small CanvasTexture. The original
   * background and fog are remembered and restored in {@link preDestroy}
   * so the framework default isn't permanently mutated by this example.
   *
   * Scene setup (background / fog) lives in the view per AGENTS.md — the
   * app class doesn't manage renderer state directly.
   */
  private _installSkyGradient(): void {
    if (!this._world) return;
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#ffb074"); // light-orange at the top
    gradient.addColorStop(0.55, "#7a5ea6"); // dusk purple transition
    gradient.addColorStop(1, "#0b1a3e"); // deep blue at the bottom
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    this._skyTexture = texture;

    const scene = this._world.scene;
    this._priorBackground = scene.background;
    this._priorFog = scene.fog;
    scene.background = texture;
    // The framework default is a tight grey fog tuned for the dark clear
    // colour; with a warm gradient sky it would tint blocks grey. Disable.
    scene.fog = null;
  }

  private _uninstallSkyGradient(): void {
    if (!this._world) return;
    const scene = this._world.scene;
    if (this._skyTexture && scene.background === this._skyTexture) {
      scene.background = this._priorBackground;
    }
    if (scene.fog === null && this._priorFog !== null) scene.fog = this._priorFog;
    this._skyTexture?.dispose();
    this._skyTexture = null;
    this._priorBackground = null;
    this._priorFog = null;
  }

  public buildBoard(cols: number, rows: number, doors: readonly Door[]): void {
    this._clearBoard();
    const cfg = this._requireConfig();
    this._cols = cols;
    this._rows = rows;

    const plateW = cols * cfg.cellSize;
    const plateD = rows * cfg.cellSize;
    this._gridPlateGeometry = new THREE.BoxGeometry(plateW, cfg.cellHeight, plateD);
    this._gridPlateMaterial = new THREE.MeshStandardMaterial({
      color: cfg.gridBaseColor,
      metalness: 0.05,
      roughness: 0.9,
    });
    this._gridPlate = new THREE.Mesh(this._gridPlateGeometry, this._gridPlateMaterial);
    this._gridPlate.position.set(0, cfg.cellHeight * 0.5, 0);
    this.add(this._gridPlate);

    this._installGridOverlay(cols, rows);

    // Taller, more pronounced studs so they read as clear cylinders under
    // the gradient sky light. Higher segment count keeps them smooth.
    const studRadius = cfg.cellSize * 0.2;
    const studHeight = cfg.blockHeight * 0.55;
    this._studGeometry = new THREE.CylinderGeometry(studRadius, studRadius, studHeight, 32);

    for (const door of doors) this._createDoorMesh(door);
  }

  public clearBoard(): void {
    this._clearBoard();
  }

  /**
   * Builds one `LineSegments` covering every horizontal and vertical grid
   * boundary from edge to edge, placed a hair above the plate top so it
   * doesn't z-fight with the plate mesh. Replaces the previous
   * cell-by-cell `EdgesGeometry(BoxGeometry)` which left seams where
   * adjacent boxes' edges coincided exactly in depth.
   */
  private _installGridOverlay(cols: number, rows: number): void {
    const cfg = this._requireConfig();
    const size = cfg.cellSize;
    const halfW = (cols * size) * 0.5;
    const halfD = (rows * size) * 0.5;
    const y = cfg.cellHeight + 0.004;
    const positions: number[] = [];
    for (let r = 0; r <= rows; r++) {
      const z = -halfD + r * size;
      positions.push(-halfW, y, z, halfW, y, z);
    }
    for (let c = 0; c <= cols; c++) {
      const x = -halfW + c * size;
      positions.push(x, y, -halfD, x, y, halfD);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({ color: cfg.gridLineColor });
    const lines = new THREE.LineSegments(geometry, material);
    this.add(lines);
    this._gridOverlay = lines;
    this._gridOverlayGeometry = geometry;
    this._gridOverlayMaterial = material;
  }

  public addBlock(block: Block): void {
    const cfg = this._requireConfig();
    if (!this._studGeometry) return;
    const color = cfg.colors[block.colorIndex % cfg.colors.length]!;
    const material = new THREE.MeshStandardMaterial({ color, metalness: 0.05, roughness: 0.5 });

    const group = new THREE.Group();
    const pickableMeshes: THREE.Mesh[] = [];

    // One solid Lego-style body extruded from the block's footprint outline,
    // with rounded top/bottom edges via ExtrudeGeometry's bevel.
    const bodyGeometry = this._createBrickBodyGeometry(block.shape);
    const bodyMesh = new THREE.Mesh(bodyGeometry, material);
    bodyMesh.userData = { blockId: block.id };
    group.add(bodyMesh);
    pickableMeshes.push(bodyMesh);

    // Classic studs on top — one per cell, centred on each occupied cell.
    // Sized to match `_studGeometry`.
    const studHeight = cfg.blockHeight * 0.55;
    const studY = cfg.blockHeight + studHeight * 0.5;
    for (const offset of block.shape) {
      const stud = new THREE.Mesh(this._studGeometry, material);
      stud.position.set(offset.col * cfg.cellSize, studY, offset.row * cfg.cellSize);
      stud.userData = { blockId: block.id };
      group.add(stud);
      pickableMeshes.push(stud);
    }

    const baseY = cfg.cellHeight;
    group.position.y = baseY;
    this.add(group);

    this._blocks.set(block.id, {
      id: block.id,
      block,
      group,
      pickableMeshes,
      bodyGeometry,
      material,
      baseY,
      isExiting: false,
    });
    this.setBlockAnchor(block.id, block.anchor.col, block.anchor.row);
  }

  /**
   * Builds one extruded mesh that covers every cell of `shape`, with
   * bevelled top and bottom edges for a Lego-plate silhouette. The
   * geometry is translated so that the anchor cell's CENTRE sits at the
   * group origin, which is where {@link setBlockAnchor} places it in
   * world space. Works for any cell-set (rectangles, squares, L-shape,
   * future arbitrary polyominoes).
   */
  private _createBrickBodyGeometry(shape: readonly { col: number; row: number }[]): THREE.BufferGeometry {
    const cfg = this._requireConfig();
    const outline = this._insetOutline(shape, cfg.blockMargin);
    const points = outline.map(
      (p) => new THREE.Vector2(p.col * cfg.cellSize, p.row * cfg.cellSize),
    );
    const threeShape = new THREE.Shape(points);
    // Generous bevel for a softly rounded Lego silhouette. `bevelOffset`
    // is negative so the bevel eats inward from the cell outline — the
    // brick stays within its footprint and adjacent bricks don't overlap.
    // Higher segment counts keep the rounding smooth under light.
    const bevelThickness = Math.min(cfg.blockHeight * 0.45, 0.14);
    const bevelSize = Math.min(cfg.cellSize * 0.11, cfg.blockHeight * 0.6);
    const geometry = new THREE.ExtrudeGeometry(threeShape, {
      depth: cfg.blockHeight,
      bevelEnabled: true,
      bevelThickness,
      bevelSize,
      bevelOffset: -bevelSize,
      bevelSegments: 6,
      curveSegments: 6,
    });
    // Shape was built in the XY plane extruding to +Z. Rotate so the
    // extrusion axis becomes +Y, and translate so: (a) the footprint's
    // anchor cell (0, 0) centre maps to the group origin, and (b) the
    // brick sits with y ∈ [0, blockHeight].
    geometry.rotateX(Math.PI / 2);
    geometry.translate(-cfg.cellSize * 0.5, cfg.blockHeight, -cfg.cellSize * 0.5);
    return geometry;
  }

  /**
   * Returns the outline polygon insed by `margin` cell units on every
   * side — the same amount {@link GameOperations} uses to shrink the
   * collider. Works for rectilinear polyominoes: each axis-aligned edge
   * is shifted toward the interior by `margin`, and each vertex lands at
   * the intersection of its two inset adjacent edges. Two collinear
   * consecutive edges contribute the same shift only once.
   */
  private _insetOutline(
    shape: readonly { col: number; row: number }[],
    margin: number,
  ): { col: number; row: number }[] {
    const outline = this._computeShapeOutline(shape);
    const n = outline.length;
    if (n === 0 || margin <= 0) return outline;

    // Per-edge shift perpendicular to the edge, pointing into the interior.
    // Polygon is CCW, so "interior is on the left" → rotate edge direction
    // 90° CCW to get the inward normal.
    const edgeShifts: { dx: number; dy: number }[] = [];
    for (let i = 0; i < n; i++) {
      const p = outline[i]!;
      const q = outline[(i + 1) % n]!;
      const ndx = Math.sign(q.col - p.col);
      const ndy = Math.sign(q.row - p.row);
      edgeShifts.push({ dx: -ndy * margin, dy: ndx * margin });
    }

    const result: { col: number; row: number }[] = [];
    for (let i = 0; i < n; i++) {
      const prev = edgeShifts[(i - 1 + n) % n]!;
      const curr = edgeShifts[i]!;
      const sameDirection = prev.dx === curr.dx && prev.dy === curr.dy;
      const dx = sameDirection ? curr.dx : prev.dx + curr.dx;
      const dy = sameDirection ? curr.dy : prev.dy + curr.dy;
      const v = outline[i]!;
      result.push({ col: v.col + dx, row: v.row + dy });
    }
    return result;
  }

  /**
   * Walks the boundary of a cell-set and returns the closed polygon as a
   * CCW-wound list of integer lattice points (in cell units). Works for
   * arbitrary simply-connected polyominoes.
   */
  private _computeShapeOutline(shape: readonly { col: number; row: number }[]): { col: number; row: number }[] {
    const cellKey = (c: number, r: number): string => `${c},${r}`;
    const occupied = new Set<string>();
    for (const c of shape) occupied.add(cellKey(c.col, c.row));
    const has = (c: number, r: number): boolean => occupied.has(cellKey(c, r));

    type Edge = { fromC: number; fromR: number; toC: number; toR: number };
    const edges: Edge[] = [];
    for (const { col, row } of shape) {
      // Each boundary edge is emitted with a direction that keeps the
      // shape on its left, producing a CCW outer winding overall.
      if (!has(col, row - 1)) edges.push({ fromC: col, fromR: row, toC: col + 1, toR: row });
      if (!has(col + 1, row)) edges.push({ fromC: col + 1, fromR: row, toC: col + 1, toR: row + 1 });
      if (!has(col, row + 1)) edges.push({ fromC: col + 1, fromR: row + 1, toC: col, toR: row + 1 });
      if (!has(col - 1, row)) edges.push({ fromC: col, fromR: row + 1, toC: col, toR: row });
    }
    if (edges.length === 0) return [];
    const byFrom = new Map<string, Edge>();
    for (const e of edges) byFrom.set(cellKey(e.fromC, e.fromR), e);

    const result: { col: number; row: number }[] = [];
    const start = edges[0]!;
    let current: Edge | undefined = start;
    let guard = 4 * shape.length + 1;
    while (current && guard-- > 0) {
      result.push({ col: current.fromC, row: current.fromR });
      const nextKey = cellKey(current.toC, current.toR);
      const next = byFrom.get(nextKey);
      if (!next || next === start) break;
      current = next;
    }
    return result;
  }

  public animateExit(blockId: number, side: DoorSide, onComplete: () => void): void {
    const record = this._blocks.get(blockId);
    if (!record) {
      onComplete();
      return;
    }
    if (record.isExiting) return;
    record.isExiting = true;

    const cfg = this._requireConfig();
    const distance = cfg.cellSize * cfg.exitAnimationDistanceCells;
    const duration = cfg.exitAnimationSeconds;

    let dx = 0;
    let dz = 0;
    if (side === "top") dz = -distance;
    else if (side === "bottom") dz = distance;
    else if (side === "left") dx = -distance;
    else if (side === "right") dx = distance;

    const startX = record.group.position.x;
    const startZ = record.group.position.z;
    const startY = record.group.position.y;

    const timeline = gsap.timeline({
      onComplete: () => {
        this._activeTimelines.delete(timeline);
        onComplete();
      },
    });
    timeline.to(
      record.group.position,
      { x: startX + dx, y: startY + 0.05, z: startZ + dz, duration, ease: "power2.in" },
      0,
    );
    timeline.to(record.group.scale, { x: 0.01, y: 0.01, z: 0.01, duration: duration * 0.6, ease: "power2.in" }, duration * 0.4);
    this._activeTimelines.add(timeline);
  }

  public removeBlock(blockId: number): void {
    const record = this._blocks.get(blockId);
    if (!record) return;
    record.group.removeFromParent();
    record.bodyGeometry.dispose();
    record.material.dispose();
    this._blocks.delete(blockId);
  }

  public setBlockAnchor(blockId: number, col: number, row: number): void {
    const record = this._blocks.get(blockId);
    if (!record) return;
    const world = this._anchorWorld(col, row);
    record.group.position.x = world.x;
    record.group.position.z = world.z;
  }

  public setBlockLifted(blockId: number, lifted: boolean): void {
    const cfg = this._requireConfig();
    const record = this._blocks.get(blockId);
    if (!record) return;
    record.group.position.y = record.baseY + (lifted ? cfg.dragLiftAmount : 0);
  }

  public onBlockPointerDown(cb: (blockId: number, pointer: GridPointer) => void): Unsubscribe {
    this._pickListeners.add(cb);
    return () => this._pickListeners.delete(cb);
  }

  public onDragMove(cb: (pointer: GridPointer) => void): Unsubscribe {
    this._moveListeners.add(cb);
    return () => this._moveListeners.delete(cb);
  }

  public onDragEnd(cb: (pointer: GridPointer) => void): Unsubscribe {
    this._upListeners.add(cb);
    return () => this._upListeners.delete(cb);
  }

  // --- Pointer input ------------------------------------------------------

  public onPointerDown(event: PointerEvent, _onThisObject: boolean): void {
    if (this._draggedBlockId !== null) return;
    const blockId = this._raycastBlock(event);
    if (blockId === null) return;
    const pointer = this._pointerGrid(event);
    if (!pointer) return;
    this._draggedBlockId = blockId;
    this._activePointerId = event.pointerId;
    for (const cb of this._pickListeners) cb(blockId, pointer);
  }

  public onPointerMove(event: PointerEvent, _onThisObject: boolean): void {
    if (this._draggedBlockId === null) return;
    if (this._activePointerId !== null && event.pointerId !== this._activePointerId) return;
    const pointer = this._pointerGrid(event);
    if (!pointer) return;
    for (const cb of this._moveListeners) cb(pointer);
  }

  public onPointerUp(event: PointerEvent, _onThisObject: boolean): void {
    if (this._draggedBlockId === null) return;
    if (this._activePointerId !== null && event.pointerId !== this._activePointerId) return;
    const pointer = this._pointerGrid(event) ?? { col: 0, row: 0 };
    this._draggedBlockId = null;
    this._activePointerId = null;
    for (const cb of this._upListeners) cb(pointer);
  }

  public onPointerCancel(_event: PointerEvent): void {
    if (this._draggedBlockId === null) return;
    const pointer = { col: 0, row: 0 };
    this._draggedBlockId = null;
    this._activePointerId = null;
    for (const cb of this._upListeners) cb(pointer);
  }

  public override preDestroy(): void {
    this._pickListeners.clear();
    this._moveListeners.clear();
    this._upListeners.clear();
    for (const tl of this._activeTimelines) tl.kill();
    this._activeTimelines.clear();
    this._uninstallKeyLight();
    this._uninstallSkyGradient();
    this._clearBoard();
    super.preDestroy();
  }

  // --- Internals ----------------------------------------------------------

  private _cellWorld(col: number, row: number): { x: number; z: number } {
    const cfg = this._requireConfig();
    const centerCol = (this._cols - 1) * 0.5;
    const centerRow = (this._rows - 1) * 0.5;
    return {
      x: (col - centerCol) * cfg.cellSize,
      z: (row - centerRow) * cfg.cellSize,
    };
  }

  /**
   * World position of a block's anchor cell (its shape-(0,0) centre).
   * Accepts floats so the view can render smoothly during a slide.
   */
  private _anchorWorld(col: number, row: number): { x: number; z: number } {
    return this._cellWorld(col, row);
  }

  private _createDoorMesh(door: Door): void {
    const cfg = this._requireConfig();
    const color = cfg.colors[door.colorIndex % cfg.colors.length]!;
    const material = new THREE.MeshStandardMaterial({ color, metalness: 0.1, roughness: 0.75 });
    this._doorMaterials.push(material);

    const span = door.spanEnd - door.spanStart + 1;
    const longSide = cfg.cellSize * span * 0.92;
    const shortSide = cfg.cellSize * 0.35;
    const height = cfg.blockHeight * 0.9;
    const halfShort = shortSide * 0.5;
    const gridHalfWidth = (this._cols * cfg.cellSize) * 0.5;
    const gridHalfDepth = (this._rows * cfg.cellSize) * 0.5;

    let width = 0;
    let depth = 0;
    let x = 0;
    let z = 0;

    if (door.side === "top" || door.side === "bottom") {
      width = longSide;
      depth = shortSide;
      x = this._cellWorld((door.spanStart + door.spanEnd) * 0.5, 0).x;
      z = door.side === "top" ? -gridHalfDepth - halfShort : gridHalfDepth + halfShort;
    } else {
      width = shortSide;
      depth = longSide;
      z = this._cellWorld(0, (door.spanStart + door.spanEnd) * 0.5).z;
      x = door.side === "left" ? -gridHalfWidth - halfShort : gridHalfWidth + halfShort;
    }

    const geom = new THREE.BoxGeometry(width, height, depth);
    this._doorGeometries.push(geom);
    const mesh = new THREE.Mesh(geom, material);
    mesh.position.set(x, height * 0.5, z);
    this.add(mesh);
    this._doorMeshes.push(mesh);
  }

  private _raycastBlock(event: PointerEvent): number | null {
    if (!this._world) return null;
    this._setNdcFromEvent(event);
    this._raycaster.setFromCamera(this._ndc, this._world.activeCamera);
    const meshes: THREE.Mesh[] = [];
    for (const record of this._blocks.values()) {
      if (record.block.cleared || record.isExiting) continue;
      meshes.push(...record.pickableMeshes);
    }
    if (meshes.length === 0) return null;
    const hits = this._raycaster.intersectObjects(meshes, false);
    if (hits.length === 0) return null;
    const data = hits[0]!.object.userData as { blockId?: number };
    return typeof data.blockId === "number" ? data.blockId : null;
  }

  private _pointerGrid(event: PointerEvent): GridPointer | null {
    if (!this._world) return null;
    this._setNdcFromEvent(event);
    this._raycaster.setFromCamera(this._ndc, this._world.activeCamera);
    const hit = this._raycaster.ray.intersectPlane(this._groundPlane, this._planeHit);
    if (!hit) return null;
    const cfg = this._requireConfig();
    const centerCol = (this._cols - 1) * 0.5;
    const centerRow = (this._rows - 1) * 0.5;
    return {
      col: this._planeHit.x / cfg.cellSize + centerCol,
      row: this._planeHit.z / cfg.cellSize + centerRow,
    };
  }

  private _setNdcFromEvent(event: PointerEvent): void {
    if (!this._world) return;
    const canvas = this._world.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    this._ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this._ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private _clearBoard(): void {
    for (const record of this._blocks.values()) {
      record.group.removeFromParent();
      record.bodyGeometry.dispose();
      record.material.dispose();
    }
    this._blocks.clear();
    this._studGeometry?.dispose();
    this._studGeometry = null;

    for (const mesh of this._doorMeshes) mesh.removeFromParent();
    this._doorMeshes.length = 0;
    for (const mat of this._doorMaterials) mat.dispose();
    this._doorMaterials.length = 0;
    for (const geom of this._doorGeometries) geom.dispose();
    this._doorGeometries.length = 0;

    this._gridOverlay?.removeFromParent();
    this._gridOverlay = null;
    this._gridOverlayGeometry?.dispose();
    this._gridOverlayGeometry = null;
    this._gridOverlayMaterial?.dispose();
    this._gridOverlayMaterial = null;

    this._gridPlate?.removeFromParent();
    this._gridPlate = null;
    this._gridPlateGeometry?.dispose();
    this._gridPlateGeometry = null;
    this._gridPlateMaterial?.dispose();
    this._gridPlateMaterial = null;
  }

  private _requireConfig(): ColorBlockJamConfig {
    if (!this._config) throw new Error("BoardView is not initialized");
    return this._config;
  }
}
