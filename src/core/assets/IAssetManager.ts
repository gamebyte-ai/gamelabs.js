import type { Texture } from "pixi.js";
import type { AssetRequest } from "./AssetRequest";
import type { AssetType } from "./AssetTypes";

export interface IAssetManager {
  //  PROPERTIES
  readonly totalItems: number;
  readonly loadedItems: number;
  readonly failedIds: ReadonlySet<string>;
  readonly hasFailures: boolean;

  //  METHODS
  load(type: AssetType, id: string, url: string): void;
  load(request: AssetRequest): void;
  loadAll(requests: Iterable<AssetRequest>): void;
  waitForAll(): Promise<void>;
  getAsset<T>(id: string): T | undefined;
  setAsset(id: string, asset: unknown): void;
  isFallback(id: string): boolean;
  getDefaultHudTexture(): Texture;
}
