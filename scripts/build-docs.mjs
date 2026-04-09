#!/usr/bin/env node

/**
 * Build all examples and copy their output into docs/examples/<name>/
 * for static GitHub Pages hosting.
 *
 * Usage: node scripts/build-docs.mjs
 *
 * Prerequisites: the library must be built first (npm run build).
 */

import { execSync } from "node:child_process";
import { cp, mkdir, rm, readdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const examplesDir = resolve(repoRoot, "examples");
const docsDir = resolve(repoRoot, "docs");
const docsExamplesDir = resolve(docsDir, "examples");

// Clean previous example builds in docs
try {
  await rm(docsExamplesDir, { recursive: true, force: true });
} catch { /* ignore if doesn't exist */ }
await mkdir(docsExamplesDir, { recursive: true });

// Discover example directories
const entries = await readdir(examplesDir, { withFileTypes: true });
const exampleNames = entries
  .filter(e => e.isDirectory())
  .map(e => e.name)
  .filter(name => !name.startsWith("."));

console.log(`Found ${exampleNames.length} examples: ${exampleNames.join(", ")}`);

for (const name of exampleNames) {
  const exampleDir = resolve(examplesDir, name);
  console.log(`\n--- Building ${name} ---`);

  // Install deps if needed
  try {
    execSync("npm install", { cwd: exampleDir, stdio: "inherit" });
  } catch (err) {
    console.error(`  npm install failed for ${name}, skipping`);
    continue;
  }

  // Build
  try {
    execSync("npm run build", { cwd: exampleDir, stdio: "inherit" });
  } catch (err) {
    console.error(`  build failed for ${name}, skipping`);
    continue;
  }

  // Copy dist output to docs/examples/<name>/
  const distDir = resolve(exampleDir, "dist");
  const outDir = resolve(docsExamplesDir, name);
  await mkdir(outDir, { recursive: true });
  await cp(distDir, outDir, { recursive: true });

  // Copy library module assets into the example's assets/ directory.
  // Module bindings reference these via `new URL("./assets/...", import.meta.url)`
  // from the bundled library code, but Vite doesn't process those URLs since
  // they come from a pre-built dependency, not from the example's own source.
  const libAssetsDir = resolve(repoRoot, "dist", "assets");
  const exampleAssetsDir = resolve(outDir, "assets");
  try {
    await cp(libAssetsDir, resolve(exampleAssetsDir, "assets"), { recursive: true });
    console.log(`  -> docs/examples/${name}/ (+ library assets)`);
  } catch {
    console.log(`  -> docs/examples/${name}/`);
  }
}

console.log("\nDone. Example builds are in docs/examples/");
