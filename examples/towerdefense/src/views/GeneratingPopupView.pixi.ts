import * as PIXI from "pixi.js";
import { PopupView } from "@gamebyte/gamelabsjs";
import type { IGeneratingPopupView } from "./IGeneratingPopupView.js";

/**
 * Minimal popup shown while a new level is being generated.
 *
 * Inherits PopupView's full-screen blocker so HUD buttons (Generate Level,
 * tower shop) cannot be clicked again until the popup is closed.
 */
export class GeneratingPopupView extends PopupView implements IGeneratingPopupView {
  private static readonly PANEL_W = 260;
  private static readonly PANEL_H = 90;
  private static readonly PANEL_R = 12;

  public override postInitialize(): void {
    super.postInitialize();

    const panel = new PIXI.Container();
    (panel as any).layout = {
      width: GeneratingPopupView.PANEL_W,
      height: GeneratingPopupView.PANEL_H,
      justifyContent: "center",
      alignItems: "center",
    };

    const bg = new PIXI.Graphics();
    bg.eventMode = "static";
    bg.roundRect(0, 0, GeneratingPopupView.PANEL_W, GeneratingPopupView.PANEL_H, GeneratingPopupView.PANEL_R);
    bg.fill({ color: 0x0b1620, alpha: 0.95 });
    bg.stroke({ color: 0x4488cc, width: 2 });
    (bg as any).layout = { position: "absolute", left: 0, top: 0, width: "100%", height: "100%" };
    panel.addChild(bg);

    const label = new PIXI.Text({
      text: "Generating level...",
      style: { fill: 0xe8eef6, fontSize: 18, fontWeight: "600", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" },
    });
    label.anchor.set(0.5, 0.5);
    (label as any).layout = {};
    panel.addChild(label);

    const wrapper = new PIXI.Container();
    (wrapper as any).layout = { width: "100%", height: "100%", justifyContent: "center", alignItems: "center" };
    wrapper.addChild(panel);
    this.addChild(wrapper);
  }
}
