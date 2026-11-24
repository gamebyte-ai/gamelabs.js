import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
});
