import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const repoRoot = resolve(__dirname, "..");
const srcDir = resolve(repoRoot, "src/modules/mainscreen/src/assets");
const outDir = resolve(repoRoot, "dist/assets/mainscreen");

await mkdir(outDir, { recursive: true });
await cp(srcDir, outDir, { recursive: true });

