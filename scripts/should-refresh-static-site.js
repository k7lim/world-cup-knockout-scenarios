const fs = require("fs/promises");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DEFAULT_SEED_PATH = path.join(ROOT, "data", "world-cup-2026-seed.json");
const DEFAULT_BEFORE_HOURS = 6;
const DEFAULT_AFTER_HOURS = 4;

const KNOCKOUT_FIXTURES = [
  ["M73", "2026-06-28T19:00:00.000Z"],
  ["M74", "2026-06-29T20:30:00.000Z"],
  ["M75", "2026-06-30T01:00:00.000Z"],
  ["M76", "2026-06-29T17:00:00.000Z"],
  ["M77", "2026-06-30T21:00:00.000Z"],
  ["M78", "2026-06-30T17:00:00.000Z"],
  ["M79", "2026-07-01T01:00:00.000Z"],
  ["M80", "2026-07-01T16:00:00.000Z"],
  ["M81", "2026-07-02T00:00:00.000Z"],
  ["M82", "2026-07-01T20:00:00.000Z"],
  ["M83", "2026-07-02T23:00:00.000Z"],
  ["M84", "2026-07-02T19:00:00.000Z"],
  ["M85", "2026-07-03T03:00:00.000Z"],
  ["M86", "2026-07-03T22:00:00.000Z"],
  ["M87", "2026-07-04T01:30:00.000Z"],
  ["M88", "2026-07-03T18:00:00.000Z"],
  ["M89", "2026-07-04T21:00:00.000Z"],
  ["M90", "2026-07-04T17:00:00.000Z"],
  ["M91", "2026-07-05T20:00:00.000Z"],
  ["M92", "2026-07-06T00:00:00.000Z"],
  ["M93", "2026-07-06T19:00:00.000Z"],
  ["M94", "2026-07-07T00:00:00.000Z"],
  ["M95", "2026-07-07T16:00:00.000Z"],
  ["M96", "2026-07-07T20:00:00.000Z"],
  ["M97", "2026-07-09T20:00:00.000Z"],
  ["M98", "2026-07-10T19:00:00.000Z"],
  ["M99", "2026-07-11T21:00:00.000Z"],
  ["M100", "2026-07-12T01:00:00.000Z"],
  ["M101", "2026-07-14T19:00:00.000Z"],
  ["M102", "2026-07-15T19:00:00.000Z"],
  ["M103", "2026-07-18T21:00:00.000Z"],
  ["M104", "2026-07-19T19:00:00.000Z"],
].map(([id, date]) => ({ id, date, source: "knockout" }));

function parseHours(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function fixtureKickoffMs(fixture) {
  const parsed = Date.parse(fixture?.date || "");
  return Number.isFinite(parsed) ? parsed : null;
}

function uniqueFixtures(fixtures) {
  const seen = new Set();
  return fixtures.filter((fixture) => {
    const key = String(fixture.id || fixture.date || "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function refreshWindowDecision(fixtures, nowMs, options = {}) {
  const beforeMs = parseHours(options.beforeHours, DEFAULT_BEFORE_HOURS) * 60 * 60 * 1000;
  const afterMs = parseHours(options.afterHours, DEFAULT_AFTER_HOURS) * 60 * 60 * 1000;
  const scheduled = uniqueFixtures(fixtures)
    .map((fixture) => ({ fixture, kickoffMs: fixtureKickoffMs(fixture) }))
    .filter((entry) => entry.kickoffMs !== null)
    .sort((a, b) => a.kickoffMs - b.kickoffMs);

  const active = scheduled.find(
    ({ kickoffMs }) => nowMs >= kickoffMs - beforeMs && nowMs <= kickoffMs + afterMs
  );

  if (active) {
    return {
      active: true,
      reason: `within refresh window for ${active.fixture.id || active.fixture.date}`,
      matchId: active.fixture.id || null,
      kickoffUtc: new Date(active.kickoffMs).toISOString(),
      windowStartsUtc: new Date(active.kickoffMs - beforeMs).toISOString(),
      windowEndsUtc: new Date(active.kickoffMs + afterMs).toISOString(),
    };
  }

  const next = scheduled.find(({ kickoffMs }) => kickoffMs + afterMs > nowMs);
  return {
    active: false,
    reason: next ? `next refresh window starts at ${new Date(next.kickoffMs - beforeMs).toISOString()}` : "no remaining refresh windows",
    matchId: next?.fixture.id || null,
    kickoffUtc: next ? new Date(next.kickoffMs).toISOString() : null,
    windowStartsUtc: next ? new Date(next.kickoffMs - beforeMs).toISOString() : null,
    windowEndsUtc: next ? new Date(next.kickoffMs + afterMs).toISOString() : null,
  };
}

async function loadFixtures(seedPath = DEFAULT_SEED_PATH) {
  const seed = JSON.parse(await fs.readFile(seedPath, "utf8"));
  return uniqueFixtures([...(seed.fixtures || []), ...KNOCKOUT_FIXTURES]);
}

function parseArgs(argv) {
  const args = {
    githubOutput: false,
    seedPath: process.env.WORLD_CUP_SEED_PATH || DEFAULT_SEED_PATH,
    now: process.env.NOW_UTC || null,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--github-output") {
      args.githubOutput = true;
    } else if (arg === "--seed") {
      args.seedPath = argv[++index];
    } else if (arg === "--now") {
      args.now = argv[++index];
    }
  }

  return args;
}

async function writeGithubOutput(decision) {
  if (!process.env.GITHUB_OUTPUT) return;
  await fs.appendFile(
    process.env.GITHUB_OUTPUT,
    `active=${decision.active ? "true" : "false"}\nreason=${decision.reason}\n`
  );
}

async function main() {
  const args = parseArgs(process.argv);
  const nowMs = Date.parse(args.now || new Date().toISOString());
  if (!Number.isFinite(nowMs)) throw new Error(`Invalid --now value: ${args.now}`);

  const fixtures = await loadFixtures(args.seedPath);
  const decision = refreshWindowDecision(fixtures, nowMs, {
    beforeHours: process.env.REFRESH_WINDOW_BEFORE_HOURS,
    afterHours: process.env.REFRESH_WINDOW_AFTER_HOURS,
  });

  if (args.githubOutput) await writeGithubOutput(decision);

  console.log(
    `${decision.active ? "active" : "inactive"}: ${decision.reason}` +
      (decision.kickoffUtc ? `; kickoff ${decision.kickoffUtc}` : "")
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  KNOCKOUT_FIXTURES,
  fixtureKickoffMs,
  refreshWindowDecision,
  loadFixtures,
};
