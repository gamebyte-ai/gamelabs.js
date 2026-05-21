import "./style.css";
import "@pixi/layout";

import { AssetTypes } from "@gamebyte/gamelabsjs";
import { Game2048App } from "./Game2048App.js";
import { Game2048AssetIds } from "./Game2048AssetIds.js";
import { PlayableAssets } from "./generated/PlayableAssets.js";

class Game2048PlayableApp extends Game2048App {
  protected override loadAssets(): void {
    this.assetManager.load(AssetTypes.Audio, Game2048AssetIds.SfxMove, PlayableAssets.sfx_move);
    this.assetManager.load(AssetTypes.Audio, Game2048AssetIds.SfxMerge, PlayableAssets.sfx_merge);
    this.assetManager.load(AssetTypes.Audio, Game2048AssetIds.SfxInvalid, PlayableAssets.sfx_invalid);
    this.assetManager.load(AssetTypes.Audio, Game2048AssetIds.SfxSpawn, PlayableAssets.sfx_spawn);
  }
}

async function start(): Promise<void> {
  const stage = document.getElementById("stage");
  if (!stage) throw new Error("Missing #stage element");

  const app = new Game2048PlayableApp(stage);
  await app.initialize();
  app.mainLoop();
}

window.addEventListener("load", () => {
  start().catch((err) => console.error("Playable failed:", err));
});
