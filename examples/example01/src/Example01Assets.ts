import { AssetRequest, AssetTypes } from "gamelabsjs";

const cubeUrl = new URL("../assets/cube.glb", import.meta.url).href;

export const Example01Assets = {
  Cube: new AssetRequest(AssetTypes.GLTF, "Example01.Cube", cubeUrl)
} as const;

