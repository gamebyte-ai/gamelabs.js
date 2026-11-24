import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const SCRIPT = join(__dirname, "..", "scripts", "check-entry-apps.mjs");

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe("check-entry-apps.mjs", () => {
  it("fails a run with no build and removes its scratch folder", () => {
    // A copy of the script in a folder with no dist/: the run fails after it made its scratch folder.
    const root = mkdtempSync(join(tmpdir(), "check-entry-apps-"));
    dirs.push(root);
    mkdirSync(join(root, "scripts"));
    copyFileSync(SCRIPT, join(root, "scripts", "check-entry-apps.mjs"));
    const temp = join(root, "temp");
    mkdirSync(temp);

    const run = spawnSync(process.execPath, [join(root, "scripts", "check-entry-apps.mjs")], {
      encoding: "utf8",
      env: { ...process.env, TMPDIR: temp, TMP: temp, TEMP: temp },
    });

    expect(run.status).toBe(1);
    expect(run.stdout).toContain("FAIL the run completed: Error: dist/ is missing");
    expect(readdirSync(temp)).toEqual([]);
  });

  it("builds its apps when the temp folder is a symlink, as macOS's default one is", () => {
    // macOS's TMPDIR, /var/folders/..., is a symlink to /private/var/folders/...: Vite once refused
    // to build there. A stand-in package (dist/ and both fixture apps) needs no real build.
    const root = mkdtempSync(join(tmpdir(), "check-entry-apps-"));
    dirs.push(root);
    const write = (file: string, text: string) => {
      mkdirSync(dirname(join(root, file)), { recursive: true });
      writeFileSync(join(root, file), text);
    };
    write("scripts/check-entry-apps.mjs", readFileSync(SCRIPT, "utf8"));
    write(
      "package.json",
      JSON.stringify({
        name: "@gamebyte/gamelabsjs",
        type: "module",
        exports: { ".": { import: "./dist/index.js", require: "./dist/index.cjs" }, "./core": { import: "./dist/core.js", require: "./dist/core.cjs" } },
      }),
    );
    write("dist/core.js", "export class GamelabsApp {}\n");
    write("dist/index.js", 'import { GamelabsApp as CoreApp } from "./core.js";\nexport class GamelabsApp extends CoreApp {}\n');
    write("dist/core.cjs", "class GamelabsApp {}\nmodule.exports = { GamelabsApp };\n");
    write("dist/index.cjs", 'const core = require("./core.cjs");\nclass GamelabsApp extends core.GamelabsApp {}\nmodule.exports = { GamelabsApp };\n');
    write("tests/fixtures/entry-apps/core-app.js", 'import { GamelabsApp } from "@gamebyte/gamelabsjs/core";\nglobalThis.app = new GamelabsApp();\n');
    // The control check looks for the name three.js assigns.
    write(
      "tests/fixtures/entry-apps/full-app.js",
      'import { GamelabsApp } from "@gamebyte/gamelabsjs";\nglobalThis.app = new GamelabsApp();\nglobalThis.__THREE__ = "stand-in";\n',
    );
    const linkType = process.platform === "win32" ? "junction" : "dir";
    // The script imports Vite from its own folder up.
    symlinkSync(join(__dirname, "..", "node_modules"), join(root, "node_modules"), linkType);
    const real = join(root, "real");
    mkdirSync(real);
    const temp = join(root, "temp");
    symlinkSync(real, temp, linkType);

    const run = spawnSync(process.execPath, [join(root, "scripts", "check-entry-apps.mjs")], {
      encoding: "utf8",
      env: { ...process.env, TMPDIR: temp, TMP: temp, TEMP: temp },
      timeout: 60_000,
    });

    expect(run.stdout).toContain("all checks passed");
    expect(run.status).toBe(0);
    expect(readdirSync(real)).toEqual([]);
  }, 90_000);
});
