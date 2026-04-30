import * as THREE from "three";
import { WorldViewBase, type IInstanceResolver } from "@gamebyte/gamelabsjs";
import type { IGameAreaView } from "./IGameAreaView";
import { BubbleShooterConfig } from "../BubbleShooterConfig";
import { BubbleGridLayout } from "../utilities/BubbleGridLayout";

const CELL_RING_SEGMENTS = 32;

/**
 * Renders the play area frame and the empty bubble grid as outline-only
 * circles. Cells are positioned via {@link BubbleGridLayout}; the grid is
 * anchored to the top-left of the play area, which in turn is centred at
 * the world origin.
 */
export class GameAreaView extends WorldViewBase implements IGameAreaView {
  private _config: BubbleShooterConfig | null = null;
  private _layout: BubbleGridLayout | null = null;

  private _backgroundMesh: THREE.Mesh | null = null;
  private readonly _borderMeshes: THREE.Mesh[] = [];
  private readonly _cellMeshes: THREE.Mesh[] = [];

  public override inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._config = resolver.getInstance(BubbleShooterConfig);
    this._layout = resolver.getInstance(BubbleGridLayout);
  }

  public override postInitialize(): void {
    super.postInitialize();
    const config = this._config!;
    const layout = this._layout!;

    const areaWidth = layout.gridWidth + 2 * config.playAreaPaddingX;
    const areaHeight = layout.gridHeight + config.playAreaPaddingTop + config.playAreaPaddingBottom;
    const halfW = areaWidth / 2;
    const halfH = areaHeight / 2;

    this._buildBackground(areaWidth, areaHeight, config.playAreaBgColor);
    this._buildBorder(areaWidth, areaHeight, config.playAreaBorderWidth, config.playAreaBorderColor);

    const gridLeftX = -halfW + config.playAreaPaddingX;
    const gridTopY = halfH - config.playAreaPaddingTop;
    this._buildCellOutlines(gridLeftX, gridTopY, layout, config);
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

  public override preDestroy(): void {
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

    this._config = null;
    this._layout = null;
  }
}
