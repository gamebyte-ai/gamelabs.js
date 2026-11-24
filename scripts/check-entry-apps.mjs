#!/usr/bin/env node
/**
 * Checks that a 2D game can use the full entry's ready-made modules without shipping three.js.
 *
 *   npm run build && node scripts/check-entry-apps.mjs           the checks CI runs
 *   npm run build && node scripts/check-entry-apps.mjs --boot    also boots each app in headless Chromium
 *
 * 1. `dist/core.*` and `dist/index.*` hold ONE copy of each class they share, in ESM and in CJS.
 *    With two copies a `/core` app refuses the full entry's modules at boot ("No binding found
 *    for token", "must extend HudViewBase"), though it typechecks clean.
 * 2. Vite builds tests/fixtures/entry-apps/core-app.js: the `/core` app with UIComponentsBinding,
 *    SettingsBinding({ audioFields: true }) and MainScreenBinding from the full entry. Its JavaScript
 *    must hold no three.js: no `__THREE__`, the name three.core.js assigns. full-app.js is the
 *    control: the same game on the full entry, whose build must hold that name.
 * 3. With --boot, each build is served on 127.0.0.1 and must set `__game.ready` with no page error,
 *    no console error and no failed request. --boot needs Playwright: `playwright` or
 *    `playwright-core` resolvable from this repo, or PLAYWRIGHT_CORE=<its package folder>.
 *    CHROMIUM_PATH=<executable> names a browser Playwright does not manage. SHOTS_DIR=<folder>
 *    keeps a screenshot of each booted app.
 *
 * The Vite config copies the parts of ongame's 2D starter that change the bundle: `base: './'`
 * and pixi.js in one chunk. It writes only under a scratch folder in the OS temp dir and removes
 * it, on failure too.
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(repoRoot, "dist");
const fixtures = join(repoRoot, "tests", "fixtures", "entry-apps");
const boot = process.argv.includes("--boot");
const BOOT_TIMEOUT_MS = 30_000;

let failed = 0;
function check(name, ok, detail) {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${detail}`);
}
const kB = (bytes) => `${(bytes / 1000).toFixed(1)} kB`;

/** Exports both entries carry must be the same objects; the full entry's app extends the `/core` app. */
function compareEntries(label, core, full) {
  const names = Object.keys(core).filter((n) => n !== "GamelabsApp");
  const missing = names.filter((n) => !(n in full));
  const copies = names.filter((n) => n in full && core[n] !== full[n]);
  const extendsCore = Object.getPrototypeOf(full.GamelabsApp) === core.GamelabsApp;
  check(
    `${label}: /core and the full entry share one copy of each class`,
    missing.length === 0 && copies.length === 0 && extendsCore,
    `${names.length} shared exports, ${copies.length} with two copies${copies.length ? ` (${copies.slice(0, 6).join(", ")}${copies.length > 6 ? ", ..." : ""})` : ""}` +
      `${missing.length ? `, missing from the full entry: ${missing.join(", ")}` : ""}; full GamelabsApp extends the /core one: ${extendsCore}`,
  );
}

/** The fixture app, built by Vite against this repo's dist/ as an installed package. */
async function buildApp(scratch, name) {
  const { build } = await import("vite");
  const dir = join(scratch, name);
  mkdirSync(join(dir, "node_modules", "@gamebyte"), { recursive: true });
  // Installed the way npm links a local package: the name resolves through package.json `exports`.
  symlinkSync(repoRoot, join(dir, "node_modules", "@gamebyte", "gamelabsjs"), "dir");
  cpSync(fixtures, dir, { recursive: true });
  writeFileSync(
    join(dir, "index.html"),
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      "<style>html,body,#stage{margin:0;width:100%;height:100%;overflow:hidden;background:#000}</style></head>" +
      `<body><div id="stage"></div><script type="module" src="./${name}.js"></script></body></html>`,
  );
  await build({
    root: dir,
    configFile: false,
    logLevel: "warn",
    base: "./",
    build: {
      outDir: join(dir, "dist"),
      emptyOutDir: true,
      chunkSizeWarningLimit: 4000,
      rollupOptions: { output: { manualChunks: (id) => (id.includes("node_modules/pixi.js") ? "pixi" : undefined) } },
    },
  });
  const assets = join(dir, "dist", "assets");
  const files = readdirSync(assets)
    .filter((f) => f.endsWith(".js"))
    .map((file) => {
      const bytes = readFileSync(join(assets, file));
      return { file, gzip: gzipSync(bytes).length, three: bytes.includes("__THREE__") };
    });
  return { dir: join(dir, "dist"), files, gzip: files.reduce((n, f) => n + f.gzip, 0), three: files.some((f) => f.three) };
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json" };

/** Serves one folder on 127.0.0.1 at a free port. */
function serve(root) {
  const server = createServer((req, res) => {
    const path = normalize(join(root, decodeURIComponent(new URL(req.url, "http://x").pathname)));
    if (!path.startsWith(root + sep) || !existsSync(path)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "content-type": MIME[extname(path)] ?? "application/octet-stream" }).end(readFileSync(path));
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok({ server, origin: `http://127.0.0.1:${server.address().port}` })));
}

function loadPlaywright() {
  const require = createRequire(join(repoRoot, "package.json"));
  for (const id of [process.env.PLAYWRIGHT_CORE, "playwright", "playwright-core"].filter(Boolean)) {
    try {
      return require(id);
    } catch {
      // try the next one
    }
  }
  return null;
}

/** Boots one build: `__game.ready`, with no page error, console error or failed request on the way. */
async function bootApp(browser, name, built) {
  const { server, origin } = await serve(built.dir);
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on("pageerror", (e) => errors.push(`page error: ${String(e).slice(0, 200)}`));
    page.on("console", (m) => m.type() === "error" && errors.push(`console error: ${m.text().slice(0, 200)}`));
    page.on("requestfailed", (r) => errors.push(`request failed: ${r.url()}`));
    page.on("response", (r) => r.status() >= 400 && errors.push(`HTTP ${r.status()}: ${r.url()}`));
    await page.goto(`${origin}/index.html`, { waitUntil: "load", timeout: BOOT_TIMEOUT_MS });
    await page
      .waitForFunction(() => globalThis.__game?.ready === true || typeof globalThis.__bootError === "string", undefined, {
        timeout: BOOT_TIMEOUT_MS,
      })
      .catch(() => errors.push(`no boot signal in ${BOOT_TIMEOUT_MS} ms`));
    // Ten drawn frames after boot, so an error in the first frames of the main screen shows too.
    await page.evaluate(() => new Promise((ok) => {
      let n = 0;
      const tick = () => (++n >= 10 ? ok() : requestAnimationFrame(tick));
      requestAnimationFrame(tick);
    }));
    const state = await page.evaluate(() => ({
      ready: globalThis.__game?.ready === true,
      world: globalThis.__game?.world === true,
      hud: document.querySelector("canvas.layer.hud2d") !== null,
      bootError: globalThis.__bootError ?? null,
    }));
    if (process.env.SHOTS_DIR) {
      mkdirSync(process.env.SHOTS_DIR, { recursive: true });
      await page.screenshot({ path: join(process.env.SHOTS_DIR, `${name}.png`) });
    }
    if (state.bootError) errors.push(`boot failed: ${state.bootError.split("\n")[0]}`);
    return { ...state, errors };
  } finally {
    server.close();
  }
}

const scratch = mkdtempSync(join(tmpdir(), "entry-apps-"));
let browser = null;
try {
  if (!existsSync(join(dist, "core.js")) || !existsSync(join(dist, "index.cjs"))) {
    throw new Error("dist/ is missing: run `npm run build` first");
  }
  // pixi.js reads `navigator` when it loads; Node 20 has none (tests/setup.ts does the same).
  globalThis.navigator ??= { userAgent: "" };
  compareEntries("ESM", await import(pathToFileURL(join(dist, "core.js")).href), await import(pathToFileURL(join(dist, "index.js")).href));
  const require = createRequire(import.meta.url);
  compareEntries("CJS", require(join(dist, "core.cjs")), require(join(dist, "index.cjs")));

  const core = await buildApp(scratch, "core-app");
  const full = await buildApp(scratch, "full-app");
  for (const [label, b] of [["full-app (3D)", full], ["core-app (2D)", core]]) {
    console.log(`${label}: ${kB(b.gzip)} of gzip JS`);
    for (const f of b.files) console.log(`    ${f.file}  ${kB(f.gzip)}${f.three ? "  [three.js]" : ""}`);
  }
  check("core-app builds with no three.js", !core.three, `__THREE__ in ${core.files.filter((f) => f.three).length} of ${core.files.length} JS files`);
  check("full-app builds with three.js (control)", full.three, `__THREE__ in ${full.files.filter((f) => f.three).length} of ${full.files.length} JS files`);

  if (boot) {
    const pw = loadPlaywright();
    if (!pw) throw new Error("--boot needs Playwright: install playwright-core or set PLAYWRIGHT_CORE=<its package folder>");
    browser = await pw.chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
    console.log(`browser: ${browser.version()}`);
    for (const [name, b, wantWorld] of [["core-app", core, false], ["full-app", full, true]]) {
      const r = await bootApp(browser, name, b);
      check(
        `${name} boots`,
        r.ready && r.hud && r.world === wantWorld && r.errors.length === 0,
        `ready=${r.ready}, hud2d canvas=${r.hud}, world3d canvas=${r.world}; ${r.errors.length ? r.errors.slice(0, 4).join(" | ") : "no errors"}`,
      );
    }
  }
} catch (err) {
  check("the run completed", false, String(err?.stack ?? err).slice(0, 600));
} finally {
  await browser?.close();
  rmSync(scratch, { recursive: true, force: true, maxRetries: 3 });
}
console.log(failed ? `${failed} check(s) failed` : "all checks passed");
process.exitCode = failed ? 1 : 0;
