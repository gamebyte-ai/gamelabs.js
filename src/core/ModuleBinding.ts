import type { ViewFactory } from "./views/ViewFactory.js";
import type { DIContainer } from "./di/DIContainer.js";
import type { IInstanceResolver } from "./di/IInstanceResolver.js";
import { AssetRequestList } from "./assets/AssetRequestList.js";

export class ModuleBinding {
  //  FIELDS
  protected readonly _assetRequestList: AssetRequestList = new AssetRequestList();

  //  GETTERS
  public get assetRequestList(): AssetRequestList {
    return this._assetRequestList;
  }

  //  METHODS

  public configureDI(diContainer: DIContainer, viewDiContainer: DIContainer): void {}

  public configureViews(viewFactory: ViewFactory<IInstanceResolver>): void {}
}
