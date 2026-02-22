import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const repoRoot = resolve(__dirname, "..");
const mainSrcDir = resolve(repoRoot, "src/modules/mainscreen/assets");
const mainOutDir = resolve(repoRoot, "dist/assets/mainscreen");

const levelProgressSrcDir = resolve(repoRoot, "src/modules/levelprogressscreeen/assets");
const levelProgressOutDir = resolve(repoRoot, "dist/assets/levelprogress");

await mkdir(mainOutDir, { recursive: true });
await cp(mainSrcDir, mainOutDir, { recursive: true });

await mkdir(levelProgressOutDir, { recursive: true });
await cp(levelProgressSrcDir, levelProgressOutDir, { recursive: true });

