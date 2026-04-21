import * as THREE from "three";
import type { IView } from "@gamebyte/gamelabsjs";

/**
 * Read API for the world-scene host view.
 */
export interface IGameSceneView extends IView {
  readonly enemyContainer: THREE.Group;
  readonly combatContainer: THREE.Group;

  showBaseHpBar(): void;
  setBaseHpRatio(ratio: number): void;
  hideBaseHpBar(): void;

  /** Show a floating "+Xg" gold indicator at the given container-local position. */
  showGoldPopup(localX: number, localZ: number, amount: number): void;
}
