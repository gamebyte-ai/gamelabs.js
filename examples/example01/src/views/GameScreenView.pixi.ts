import * as PIXI from "pixi.js";
import { ScreenView, type IViewFactory, type ScreenTransition } from "gamelabsjs";
import type { IGameScreenView } from "./IGameScreenView";
import { TopBarView } from "./TopBarView.pixi";
import { DebugBarView } from "./DebugBarView.pixi";

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
  private readonly viewFactory: IViewFactory | null;

  constructor(deps?: { viewFactory: IViewFactory }) {
    super();

    // Keep an invisible overlay so the screen has bounds and can later host interactions.
    this.addChild(this.overlay);

    this.viewFactory = deps?.viewFactory ?? null;
    if (this.viewFactory) {
      // View owns subview creation.
      this.topBar = this.viewFactory.createView(TopBarView, this);
      this.debugBar = this.viewFactory.createView(DebugBarView, this);
    }
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
    this.controller?.destroy();
    this.controller = null;

    // View owns subview teardown.
    this.topBar?.destroy();
    this.topBar = null;
    this.debugBar?.destroy();
    this.debugBar = null;

    // Keep it consistent with other Example01 Pixi views:
    // - do not Pixi-destroy recursively
    // - just detach and remove listeners
    this.removeAllListeners();
    this.removeFromParent();
  }
}

