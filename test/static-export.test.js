const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { staticAppSource, staticIndexSource } = require("../scripts/export-static-site");

test("static export rewrites browser paths for GitHub Pages project hosting", () => {
  const appSource = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");
  const indexSource = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");

  const staticApp = staticAppSource(appSource);
  const staticIndex = staticIndexSource(indexSource);

  assert.match(staticApp, /const LOCAL_SEED_URL = "data\/world-cup-2026-seed\.json";/);
  assert.match(staticApp, /fetchJson\("data\/annexe-c\.json"\)/);
  assert.doesNotMatch(staticApp, /"\/data\//);
  assert.doesNotMatch(staticApp, /"\/api\//);
  assert.doesNotMatch(staticIndex, /href="\//);
  assert.doesNotMatch(staticIndex, /src="\//);
});
