import "./style.css";
import "@pixi/layout";

import { HexaSortApp } from "./HexaSortApp.js";
import { PlayableAssets } from "./generated/PlayableAssets.js";

// HexaSort uses no game-specific assets — only framework default UI
// textures via SettingsBinding + UIComponentsBinding, which Vite inlines
// directly from dist/index.js. The PlayableAssets import keeps the
// generated registry live for when assets are added later.
const _ = PlayableAssets;
void _;

async function start(): Promise<void> {
  const stage = document.getElementById("stage");
  if (!stage) throw new Error("Missing #stage element");

  const app = new HexaSortApp(stage);
  await app.initialize();
  app.mainLoop();
}

window.addEventListener("load", () => {
  start().catch((err) => console.error("Playable failed:", err));
});
