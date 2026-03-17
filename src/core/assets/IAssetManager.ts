export interface IAssetManager {
  getAsset<T>(id: string): T | undefined;
}
