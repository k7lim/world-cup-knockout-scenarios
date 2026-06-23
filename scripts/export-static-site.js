const fs = require("fs/promises");
const path = require("path");
const { buildSeed, writeSeed } = require("./build-openfootball-seed");
const { buildOddsPredictionsPayload } = require("../server");

const ROOT = path.join(__dirname, "..");
const DATA_SEED_PATH = path.join(ROOT, "data", "world-cup-2026-seed.json");
const DOCS_SEED_PATH = path.join(ROOT, "docs", "data", "world-cup-2026-seed.json");
const DATA_ANNEXE_PATH = path.join(ROOT, "data", "annexe-c.json");
const DOCS_ANNEXE_PATH = path.join(ROOT, "docs", "data", "annexe-c.json");
const PUBLIC_DIR = path.join(ROOT, "public");
const DOCS_DIR = path.join(ROOT, "docs");

function fixturePayload(fixture) {
  return {
    id: fixture.id,
    date: fixture.date,
    group: fixture.group,
    statusShort: fixture.statusShort,
    home: { name: fixture.home?.name },
    away: { name: fixture.away?.name },
    goals: fixture.goals,
  };
}

async function copyPublicAssets() {
  await fs.mkdir(DOCS_DIR, { recursive: true });
  await fs.copyFile(path.join(PUBLIC_DIR, "styles.css"), path.join(DOCS_DIR, "styles.css"));
  const indexSource = await fs.readFile(path.join(PUBLIC_DIR, "index.html"), "utf8");
  await fs.writeFile(path.join(DOCS_DIR, "index.html"), staticIndexSource(indexSource));
  const appSource = await fs.readFile(path.join(PUBLIC_DIR, "app.js"), "utf8");
  await fs.writeFile(path.join(DOCS_DIR, "app.js"), staticAppSource(appSource));
  await fs.writeFile(path.join(DOCS_DIR, ".nojekyll"), "");
}

function staticIndexSource(source) {
  return source
    .replace(/href="\/styles\.css([^"]*)"/, 'href="styles.css$1"')
    .replace(/src="\/app\.js([^"]*)"/, 'src="app.js$1"')
    .replace(/\s*<button id="refreshBtn" class="secondary-btn compact" type="button">Refresh<\/button>/, "");
}

function staticAppSource(source) {
  return source
    .replace('const LOCAL_SEED_URL = "/data/world-cup-2026-seed.json";', 'const LOCAL_SEED_URL = "data/world-cup-2026-seed.json";')
    .replace('state.annexe = await fetchJson("/data/annexe-c.json");', 'state.annexe = await fetchJson("data/annexe-c.json");')
    .replace(
      /async function refreshSourceFromGitHub\(\) \{[\s\S]*?\n\}\n\nasync function refreshData/,
      `async function refreshSourceFromGitHub() {
  await loadLocalData();
  return {
    fixtures: state.fixtures,
  };
}

async function refreshData`
    )
    .replace(
      /async function bootFromSources\(\) \{[\s\S]*?\n\}\n\nfunction setBusy/,
      `async function bootFromSources() {
  await loadLocalData();
}

function setBusy`
    )
    .replace(
      /async function seedFromOdds\(mode = "seedEmpty", options = \{\}\) \{[\s\S]*?\n\}\n\nfunction clearPredictions/,
      `async function seedFromOdds(mode = "seedEmpty", options = {}) {
  els.oddsStatus.textContent = "Odds refresh is unavailable on the static GitHub Pages build.";
  renderAll();
}

function clearPredictions`
    );
}

async function exportStaticSite() {
  const seed = await buildSeed();
  const oddsPayload = await buildOddsPredictionsPayload(seed.fixtures.map(fixturePayload), "syncOdds");
  const staticSeed = {
    ...seed,
    staticExport: {
      exportedAtUtc: new Date().toISOString(),
      note: "GitHub Pages snapshot. Rebuilt by scheduled workflow; odds evidence includes per-fixture stale metadata.",
    },
    predictions: oddsPayload.predictions,
    marketEvidence: oddsPayload.marketEvidence,
    oddsUnavailable: oddsPayload.oddsUnavailable,
    providerStatus: oddsPayload.providerStatus,
    predictionSource: oddsPayload.source,
    predictionsExportedAtUtc: oddsPayload.exportedAtUtc,
  };

  await writeSeed(seed, DATA_SEED_PATH);
  await fs.mkdir(path.dirname(DOCS_SEED_PATH), { recursive: true });
  await fs.writeFile(DOCS_SEED_PATH, `${JSON.stringify(staticSeed, null, 2)}\n`);
  await fs.copyFile(DATA_ANNEXE_PATH, DOCS_ANNEXE_PATH);
  await copyPublicAssets();

  return {
    fixtures: seed.fixtures.length,
    predictions: Object.keys(staticSeed.predictions || {}).length,
    unavailable: staticSeed.oddsUnavailable?.length || 0,
    exportedAtUtc: staticSeed.staticExport.exportedAtUtc,
  };
}

async function main() {
  const summary = await exportStaticSite();
  console.log(
    `Exported docs snapshot: ${summary.fixtures} fixtures, ${summary.predictions} predictions, ${summary.unavailable} unavailable`
  );
  console.log(`Updated at ${summary.exportedAtUtc}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  exportStaticSite,
  staticIndexSource,
  staticAppSource,
};
