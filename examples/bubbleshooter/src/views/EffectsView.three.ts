import * as THREE from "three";
import { WorldViewBase, type IInstanceResolver } from "@gamebyte/gamelabsjs";
import type { IEffectsView } from "./IEffectsView";
import { BubbleShooterConfig } from "../BubbleShooterConfig";
import { BUBBLE_COLOR_HEX, type BubbleColor } from "../constants/BubbleColor";

const PARTICLE_SEGMENTS = 10;
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
 * Pop-feedback effects layer — particle bursts and floating score
 * popups. Self-contained; no shared GPU resources with other sub-views.
 * Both effect types are pooled to keep allocations off the per-frame
 * path during bomb-bursts that can pop 19 cells at once.
 */
export class EffectsView extends WorldViewBase implements IEffectsView {
  private _config: BubbleShooterConfig | null = null;

  private _particleGeometry: THREE.CircleGeometry | null = null;
  private readonly _particles: IPopParticle[] = [];

  private readonly _scorePopups: IScorePopup[] = [];
  private readonly _scorePopupPool: IScorePopup[] = [];

  public override inject(resolver: IInstanceResolver): void {
    super.inject(resolver);
    this._config = resolver.getInstance(BubbleShooterConfig);
  }

  public override postInitialize(): void {
    super.postInitialize();
    const config = this._config;
    if (!config) return;
    this._particleGeometry = new THREE.CircleGeometry(config.popParticleRadius, PARTICLE_SEGMENTS);
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

  private _acquireParticle(colorHex: number): IPopParticle {
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

  public override preDestroy(): void {
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

    this._config = null;
    super.preDestroy();
  }
}
