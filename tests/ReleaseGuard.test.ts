import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { isAncestorOfMain, npmSupportsTrustedPublishing } from "../scripts/release-guard.mjs";

const GUARD = join(__dirname, "..", "scripts", "release-guard.mjs");

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function commit(cwd: string, name: string): string {
  writeFileSync(join(cwd, name), name);
  git(cwd, "add", name);
  git(cwd, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", name);
  return git(cwd, "rev-parse", "HEAD");
}

// A clone whose origin/main holds `onMain`; `offMain` exists only on an unmerged branch.
function repoWithMainAndBranch(): { clone: string; onMain: string; offMain: string } {
  const origin = mkdtempSync(join(tmpdir(), "release-guard-origin-"));
  dirs.push(origin);
  git(origin, "init", "-q", "-b", "main");
  commit(origin, "a");
  const onMain = commit(origin, "b");
  git(origin, "checkout", "-q", "-b", "feature");
  const offMain = commit(origin, "c");
  git(origin, "checkout", "-q", "main");
  const clone = mkdtempSync(join(tmpdir(), "release-guard-clone-"));
  dirs.push(clone);
  git(clone, "clone", "-q", origin, ".");
  git(clone, "fetch", "-q", "origin", "feature");
  return { clone, onMain, offMain };
}

describe("npmSupportsTrustedPublishing", () => {
  it.each([
    ["11.5.1", true],
    ["11.6.0", true],
    ["12.0.0", true],
    ["11.10.0", true],
    ["11.5.0", false],
    ["11.4.9", false],
    ["10.9.2", false],
    ["11.5.1-pre.0", false],
    ["11.6.0-pre.0", false],
    ["not-a-version", false],
  ])("npm %s -> %s", (version, expected) => {
    expect(npmSupportsTrustedPublishing(version)).toBe(expected);
  });
});

describe("isAncestorOfMain", () => {
  it("accepts a commit that is on origin/main", () => {
    const { clone, onMain } = repoWithMainAndBranch();
    expect(isAncestorOfMain(onMain, "origin/main", clone)).toBe(true);
  });

  it("refuses a commit that is only on an unmerged branch", () => {
    const { clone, offMain } = repoWithMainAndBranch();
    expect(isAncestorOfMain(offMain, "origin/main", clone)).toBe(false);
  });

  it("throws when origin/main is missing instead of passing", () => {
    const { clone, onMain } = repoWithMainAndBranch();
    expect(() => isAncestorOfMain(onMain, "origin/no-such-branch", clone)).toThrow();
  });
});

describe("release-guard CLI", () => {
  it("main-ancestor exits 0 for HEAD on main and 1 for HEAD off main", () => {
    const { clone, offMain } = repoWithMainAndBranch();
    expect(spawnSync("node", [GUARD, "main-ancestor"], { cwd: clone }).status).toBe(0);
    git(clone, "checkout", "-q", "--detach", offMain);
    const off = spawnSync("node", [GUARD, "main-ancestor"], { cwd: clone, encoding: "utf8" });
    expect(off.status).toBe(1);
    expect(off.stderr).toContain("not on origin/main");
  });

  it("rejects an unknown check", () => {
    expect(spawnSync("node", [GUARD, "nope"]).status).toBe(2);
  });
});
