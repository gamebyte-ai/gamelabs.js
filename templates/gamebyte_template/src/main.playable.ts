import { MyGameApp } from "./MyGameApp";
import { PlayableAssets } from "./generated/PlayableAssets";

// PlayableAssets is the generated id -> data: URI registry. When you add
// game assets, override loadAssets() on a subclass of MyGameApp and pass
// values from PlayableAssets as the `url` argument:
//
//   class MyGamePlayableApp extends MyGameApp {
//     protected override loadAssets(): void {
//       this.assetManager.load(AssetTypes.HudTexture, MyAssetIds.Logo, PlayableAssets.logo);
//     }
//   }
//
// Until then, _ = PlayableAssets keeps the import live so the generated
// module is included in the build and shapes are type-checked.
const _ = PlayableAssets;
void _;

const app = new MyGameApp(document.getElementById("stage")!);
await app.initialize();
app.mainLoop();
