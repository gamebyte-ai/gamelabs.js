import * as PIXI from "pixi.js";
import { ScreenView, type ScreenTransition } from "gamelabsjs";
import type { IGameScreenView } from "./IGameScreenView";
import type { TopBarView } from "./TopBarView.pixi";
import type { DebugBarView } from "./DebugBarView.pixi";

/**
 * Example01 gameplay screen (Pixi).
 *
 * This is created at app start with an instant transition.
 * Keep it visually subtle so it doesn't obscure the Three.js world layer.
 */
export class GameScreenView extends ScreenView implements IGameScreenView {
  private readonly overlay = new PIXI.Graphics();

  private topBar: TopBarView | null = null;
  private debugBar: DebugBarView | null = null;

  constructor() {
    super();

    // Keep an invisible overlay so the screen has bounds and can later host interactions.
    this.addChild(this.overlay);
  }

  attachTopBar(view: TopBarView): void {
    this.topBar?.removeFromParent();
    this.topBar = view;
    this.addChild(view);
  }

  attachDebugBar(view: DebugBarView): void {
    this.debugBar?.removeFromParent();
    this.debugBar = view;
    this.addChild(view);
  }

  override onEnter(_transition: ScreenTransition): void | Promise<void> {
    // No-op for now; hook for future animations/initialization.
  }

  override onExit(_transition: ScreenTransition): void | Promise<void> {
    // No-op for now; hook for future teardown/animations.
  }

  resize(width: number, height: number): void {
    this.overlay.clear();
    // Transparent overlay; keeps the screen non-obtrusive while defining bounds.
    this.overlay.rect(0, 0, Math.max(1, width), Math.max(1, height)).fill({ color: 0x000000, alpha: 0 });

    this.topBar?.resize(width, height);
    this.debugBar?.resize(width, height);
  }

  override destroy(): void {
    // Keep it consistent with other Example01 Pixi views:
    // - do not Pixi-destroy recursively
    // - just detach and remove listeners
    this.removeAllListeners();
    this.removeFromParent();
  }
}

