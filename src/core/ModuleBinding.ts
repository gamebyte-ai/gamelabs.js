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

  public configureDI(_diContainer: DIContainer, _viewDiContainer: DIContainer): void {}

  public configureViews(_viewFactory: ViewFactory<IInstanceResolver>): void {}
}
