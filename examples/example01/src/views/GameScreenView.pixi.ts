import * as PIXI from "pixi.js";
import { ScreenView } from "gamelabsjs";
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

  public postInitialize(): void {
    // Enable flex layout: top bar at top, debug bar at bottom.
    (this as any).layout = {
      width: 1,
      height: 1,
      flexDirection: "column",
      justifyContent: "space-between",
      padding: 16,
      gap: 12
    };

    // Invisible overlay to define bounds + potential future interactions.
    (this.overlay as any).layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };
    if (!this.overlay.parent) this.addChild(this.overlay);

    // View owns subview creation.
    const topBar = this.viewFactory.createView(TopBarView, this);
    this.topBar = topBar;
    const debugBar = this.viewFactory.createView(DebugBarView, this);
    this.debugBar = debugBar;

    // Layout children: fill width, take intrinsic height.
    (topBar as any).layout = { width: "100%" };
    (debugBar as any).layout = { width: "100%" };
  }

  override onResize(width: number, height: number, _dpr: number): void {
    // Drive layout sizing from the app.
    (this as any).layout = { width: Math.max(1, width), height: Math.max(1, height) };

    this.overlay.clear();
    // Transparent overlay; keeps the screen non-obtrusive while defining bounds.
    this.overlay.rect(0, 0, Math.max(1, width), Math.max(1, height)).fill({ color: 0x000000, alpha: 0 });

    // Keep these calls for the current view contracts; layout does most of the work.
    this.topBar?.resize(width, height);
    this.debugBar?.resize(width, height);
  }

  override destroy(): void {
    this.topBar?.destroy();
    this.topBar = null;
    this.debugBar?.destroy();
    this.debugBar = null;
    
    super.destroy();
  }
}

