import { AssetLoader } from "./assets/AssetLoader.js";
import { ViewFactory } from "./views/ViewFactory.js";
import { DIContainer } from "./di/DIContainer.js";
import type { IInstanceResolver } from "./di/IInstanceResolver.js";

export abstract class IModuleBinding {
  abstract configureDI(diContainer: DIContainer): void;
  abstract configureViews(viewFactory: ViewFactory<IInstanceResolver>): void;
  abstract loadAssets(assetLoader: AssetLoader): void;
}

