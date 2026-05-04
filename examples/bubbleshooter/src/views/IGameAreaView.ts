import type { IView, Unsubscribe } from "@gamebyte/gamelabsjs";
import type { BubbleColor } from "../constants/BubbleColor";
import type { IAimTrajectory } from "../utilities/AimTrajectoryCalculator";

export interface IGameAreaView extends IView {
  setBubble(row: number, col: number, color: BubbleColor): void;
  removeBubble(row: number, col: number): void;
  setShooterHeldColor(color: BubbleColor | null): void;
  setShooterNextColor(color: BubbleColor | null): void;
  setShooterIsBomb(active: boolean): void;
  setShooterIsFireball(active: boolean): void;
  setShooterAimAngle(angle: number): void;
  setAimTrajectory(trajectory: IAimTrajectory): void;
  setAimPowerUpMode(active: boolean): void;
  updateAimDots(dt: number): void;
  setFlyingBubble(color: BubbleColor | null, x: number, y: number): void;
  setFlyingBomb(active: boolean, x: number, y: number): void;
  setFireball(active: boolean, x: number, y: number): void;
  setFallingBubble(id: number, color: BubbleColor | null, x: number, y: number): void;
  playPopBurst(x: number, y: number, color: BubbleColor): void;
  updateParticles(dt: number): void;
  onAimAtWorld(cb: (worldX: number, worldY: number) => void): Unsubscribe;
  onFire(cb: () => void): Unsubscribe;
  onSwap(cb: () => void): Unsubscribe;
}
