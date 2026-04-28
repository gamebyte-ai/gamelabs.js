import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const repoRoot = resolve(__dirname, "..");
const mainSrcDir = resolve(repoRoot, "src/modules/mainscreen/assets");
const mainOutDir = resolve(repoRoot, "dist/assets/mainscreen");

const levelProgressSrcDir = resolve(repoRoot, "src/modules/levelprogressscreen/assets");
const levelProgressOutDir = resolve(repoRoot, "dist/assets/levelprogress");

const onscreenControlsSrcDir = resolve(repoRoot, "src/modules/onscreencontrols/assets");
const onscreenControlsOutDir = resolve(repoRoot, "dist/assets/onscreencontrols");

await mkdir(mainOutDir, { recursive: true });
await cp(mainSrcDir, mainOutDir, { recursive: true });

await mkdir(levelProgressOutDir, { recursive: true });
await cp(levelProgressSrcDir, levelProgressOutDir, { recursive: true });

await mkdir(onscreenControlsOutDir, { recursive: true });
await cp(onscreenControlsSrcDir, onscreenControlsOutDir, { recursive: true });

