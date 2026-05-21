import "./style.css";
import "@pixi/layout";

import { AssetTypes } from "@gamebyte/gamelabsjs";
import { Match3App } from "./Match3App.js";
import { Match3AssetIds } from "./Match3AssetIds.js";
import { PlayableAssets } from "./generated/PlayableAssets.js";

class Match3PlayableApp extends Match3App {
  protected override loadAssets(): void {
    this.assetManager.load(AssetTypes.WorldTexture, Match3AssetIds.GemRed, PlayableAssets.gem_red);
    this.assetManager.load(AssetTypes.WorldTexture, Match3AssetIds.GemBlue, PlayableAssets.gem_blue);
    this.assetManager.load(AssetTypes.WorldTexture, Match3AssetIds.GemGreen, PlayableAssets.gem_green);
    this.assetManager.load(AssetTypes.WorldTexture, Match3AssetIds.GemYellow, PlayableAssets.gem_yellow);
    this.assetManager.load(AssetTypes.WorldTexture, Match3AssetIds.GemPurple, PlayableAssets.gem_purple);

    this.assetManager.load(AssetTypes.Audio, Match3AssetIds.SfxSelect, PlayableAssets.sfx_select);
    this.assetManager.load(AssetTypes.Audio, Match3AssetIds.SfxSwap, PlayableAssets.sfx_swap);
    this.assetManager.load(AssetTypes.Audio, Match3AssetIds.SfxWrong, PlayableAssets.sfx_wrong);
    this.assetManager.load(AssetTypes.Audio, Match3AssetIds.SfxPop, PlayableAssets.sfx_pop);
    this.assetManager.load(AssetTypes.Audio, Match3AssetIds.MusicBg, PlayableAssets.music_bg);
  }
}

async function start(): Promise<void> {
  const stage = document.getElementById("stage");
  if (!stage) throw new Error("Missing #stage element");

  const app = new Match3PlayableApp(stage);
  await app.initialize();
  app.mainLoop();
}

window.addEventListener("load", () => {
  start().catch((err) => console.error("Playable failed:", err));
});
