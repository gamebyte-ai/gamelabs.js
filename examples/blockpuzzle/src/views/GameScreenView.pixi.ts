import { LabelComponent, ScreenView, UIComponentsStyleIds, type LabelComponentStyle } from "@gamebyte/gamelabsjs";
import type { IGameScreenView } from "./IGameScreenView";

const TITLE_LABEL_SIZE = 22;
const TITLE_LABEL_MARGIN = 16;

/**
 * HUD overlay for the game screen. Step 1 carries a single corner
 * title; later steps add score and end-state labels here, leaning on
 * the same `UIComponentsBinding` style for visual consistency.
 */
export class GameScreenView extends ScreenView implements IGameScreenView {
  private _titleLabel: LabelComponent | null = null;

  public override postInitialize(): void {
    super.postInitialize();

    this._titleLabel = this.buildTitleLabel("Block Puzzle");
    this._titleLabel.layout = { position: "absolute", left: TITLE_LABEL_MARGIN, top: TITLE_LABEL_MARGIN };
    this.addChild(this._titleLabel);
  }

  public override onResize(width: number, height: number, dpr: number): void {
    super.onResize(width, height, dpr);
    // Absolute-positioned children resolve against the screen's own
    // layout box, so the screen needs explicit width/height every
    // time the canvas changes size. Without this the children stack
    // at (0, 0).
    this.layout = { width: Math.max(1, width), height: Math.max(1, height) };
  }

  private buildTitleLabel(initialText: string): LabelComponent {
    const style = this.styleManager.resolve<LabelComponentStyle>(UIComponentsStyleIds.Label, {
      text: { fontSize: TITLE_LABEL_SIZE, fontWeight: "600", color: 0xffffff },
    });
    return new LabelComponent(this.assetLoader, style, { text: initialText });
  }
}
