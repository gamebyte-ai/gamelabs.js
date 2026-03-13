import { ViewFactory } from "./views/ViewFactory.js";
import { DIContainer } from "./di/DIContainer.js";
import type { IInstanceResolver } from "./di/IInstanceResolver.js";
import { AssetRequestList } from "./assets/AssetRequestList.js";

export class ModuleBinding {
  //  FIELDS
  protected readonly _assetRequestList: AssetRequestList = new AssetRequestList();
  public get assetRequestList(): AssetRequestList {
    return this._assetRequestList;
  }

  //  METHODS
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public configureDI(diContainer: DIContainer, viewDiContainer: DIContainer): void {}
  
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public configureViews(viewFactory: ViewFactory<IInstanceResolver>): void{}
  
}
