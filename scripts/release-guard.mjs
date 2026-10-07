// Pre-publish checks for .github/workflows/release.yml. Plain Node and git only: the release job must
// not download anything it does not need, so no `npx semver`.
//
//   node scripts/release-guard.mjs main-ancestor   # HEAD (the tagged commit) is on origin/main
//   node scripts/release-guard.mjs npm-version     # this npm can do trusted publishing (>= 11.5.1)
//
// Exit 0 = pass, 1 = refused, 2 = bad usage.
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MIN_NPM = [11, 5, 1];

// Stable x.y.z only: a prerelease npm is refused, like semver's default range matching.
export function npmSupportsTrustedPublishing(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(version).trim());
  if (!match) return false;
  const parts = match.slice(1).map(Number);
  for (let i = 0; i < MIN_NPM.length; i++) {
    if (parts[i] !== MIN_NPM[i]) return parts[i] > MIN_NPM[i];
  }
  return true;
}

// True when `commit` is reachable from `mainRef`. Throws when git cannot answer (missing ref, shallow
// clone without the history), so a broken checkout never reads as "on main".
export function isAncestorOfMain(commit, mainRef, cwd) {
  const result = spawnSync("git", ["merge-base", "--is-ancestor", commit, mainRef], { cwd, encoding: "utf8" });
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  throw new Error(`git merge-base failed (exit ${result.status}): ${result.stderr || result.error}`);
}

function main(check) {
  if (check === "main-ancestor") {
    const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    if (!isAncestorOfMain(head, "origin/main")) {
      console.error(`Refusing to publish: ${head} is not on origin/main. Tag a commit that was merged to main.`);
      return 1;
    }
    console.log(`${head} is on origin/main`);
    return 0;
  }
  if (check === "npm-version") {
    const version = execFileSync("npm", ["--version"], { encoding: "utf8" }).trim();
    if (!npmSupportsTrustedPublishing(version)) {
      console.error(`Refusing to publish: npm ${version} cannot do trusted publishing (needs >= ${MIN_NPM.join(".")}).`);
      return 1;
    }
    console.log(`npm ${version} supports trusted publishing`);
    return 0;
  }
  console.error("usage: node scripts/release-guard.mjs main-ancestor|npm-version");
  return 2;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main(process.argv[2]);
  } catch (error) {
    console.error(`Refusing to publish: ${error.message}`);
    process.exitCode = 1;
  }
}
