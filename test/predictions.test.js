const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadApp() {
  const appPath = path.join(__dirname, "..", "public", "app.js");
  let source = fs.readFileSync(appPath, "utf8");
  source = source.replace(/bindEvents\(\);\s*bootFromSources\(\);\s*$/, "");
  source += `
globalThis.__test = {
  state,
  els,
  ROUND_OF_32,
  KNOCKOUT_ROUNDS,
  getFixtureScore,
  normalizeLocalSeed,
    computeTournament,
    safeNumber,
    teamFlagEmoji,
    teamShortName,
    isCriticalWarning,
    updatePredictionFromInput
  };
`;

  const elements = new Map();
  const document = {
    getElementById(id) {
      if (!elements.has(id)) {
        elements.set(id, {
          id,
          checked: id === "useLiveScores",
          addEventListener() {},
          innerHTML: "",
          value: "",
        });
      }
      return elements.get(id);
    },
    querySelectorAll() {
      return [];
    },
  };
  const localStorage = {
    getItem() {
      return "{}";
    },
    setItem() {},
  };

  const context = {
    document,
    localStorage,
    Intl,
    Date,
    Number,
    String,
    Set,
    Map,
    Array,
    Object,
    JSON,
    console,
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.__test;
}

function liveFixture() {
  return {
    id: 2026025,
    statusShort: "1H",
    goals: { home: 0, away: 0 },
    home: { id: 1, name: "Japan" },
    away: { id: 2, name: "Tunisia" },
  };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("manual prediction overrides provisional live score", () => {
  const { state, getFixtureScore } = loadApp();
  const fixture = liveFixture();
  state.predictions[fixture.id] = { home: 2, away: 1, source: "manual" };

  assert.deepEqual(plain(getFixtureScore(fixture)), { home: 2, away: 1, source: "manual" });
});

test("editing one side of a live score stores the other displayed side", () => {
  const { state, getFixtureScore, updatePredictionFromInput } = loadApp();
  const fixture = liveFixture();
  const displayedScore = getFixtureScore(fixture);

  updatePredictionFromInput(fixture, "home", "2", displayedScore);

  assert.deepEqual(plain(state.predictions[fixture.id]), {
    home: "2",
    away: 0,
    source: "manual",
  });
  assert.deepEqual(plain(getFixtureScore(fixture)), { home: 2, away: 0, source: "manual" });
});

test("blank score fields are not treated as zero", () => {
  const { safeNumber } = loadApp();

  assert.equal(safeNumber(""), null);
});

test("played-only group status ignores editable predictions", () => {
  const { state, computeTournament } = loadApp();
  const teams = [
    { id: 1, name: "Alpha", group: "A", officialRank: 1 },
    { id: 2, name: "Beta", group: "A", officialRank: 2 },
    { id: 3, name: "Gamma", group: "A", officialRank: 3 },
    { id: 4, name: "Delta", group: "A", officialRank: 4 },
  ];
  state.standingsGroups.set("A", teams);
  state.fixtures = [
    {
      id: 10,
      group: "A",
      statusShort: "FT",
      goals: { home: 1, away: 0 },
      home: teams[0],
      away: teams[1],
    },
    {
      id: 11,
      group: "A",
      statusShort: "NS",
      goals: { home: null, away: null },
      home: teams[2],
      away: teams[3],
    },
  ];
  state.predictions[11] = { home: 0, away: 3, source: "manual" };

  const current = computeTournament({ playedOnly: true }).rankedGroups.get("A");
  const projected = computeTournament().rankedGroups.get("A");

  assert.equal(current.find((team) => team.name === "Delta").points, 0);
  assert.equal(projected.find((team) => team.name === "Delta").points, 3);
});

test("static seed imports bundled odds predictions without replacing manual picks", () => {
  const { state, getFixtureScore, normalizeLocalSeed } = loadApp();
  const seed = {
    updatedAtUtc: "2026-06-22T21:13:34.040Z",
    source: { name: "test seed" },
    groups: [
      {
        letter: "A",
        teams: [
          { id: 1, name: "Alpha", seedRank: 1 },
          { id: 2, name: "Beta", seedRank: 2 },
          { id: 3, name: "Gamma", seedRank: 3 },
          { id: 4, name: "Delta", seedRank: 4 },
        ],
      },
    ],
    fixtures: [
      {
        id: 10,
        group: "A",
        date: "2026-06-12T00:00:00.000Z",
        statusShort: "NS",
        home: { id: 1, name: "Alpha" },
        away: { id: 2, name: "Beta" },
        goals: { home: null, away: null },
      },
      {
        id: 11,
        group: "A",
        date: "2026-06-13T00:00:00.000Z",
        statusShort: "NS",
        home: { id: 3, name: "Gamma" },
        away: { id: 4, name: "Delta" },
        goals: { home: null, away: null },
      },
    ],
    predictions: {
      10: { home: 2, away: 1, source: "odds" },
      11: { home: 0, away: 2, source: "odds" },
    },
    marketEvidence: {
      10: { updatedAtUtc: "2026-06-22T21:00:00.000Z" },
    },
  };
  state.predictions[11] = { home: 1, away: 1, source: "manual" };

  normalizeLocalSeed(seed);

  assert.deepEqual(plain(getFixtureScore(state.fixtures[0])), { home: 2, away: 1, source: "odds" });
  assert.deepEqual(plain(getFixtureScore(state.fixtures[1])), { home: 1, away: 1, source: "manual" });
  assert.deepEqual(plain(state.marketEvidence[10]), { updatedAtUtc: "2026-06-22T21:00:00.000Z" });
});

test("static seed replaces stale blank manual predictions with bundled odds", () => {
  const { state, getFixtureScore, normalizeLocalSeed } = loadApp();
  const seed = {
    updatedAtUtc: "2026-06-22T21:13:34.040Z",
    source: { name: "test seed" },
    groups: [
      {
        letter: "A",
        teams: [
          { id: 1, name: "Alpha", seedRank: 1 },
          { id: 2, name: "Beta", seedRank: 2 },
        ],
      },
    ],
    fixtures: [
      {
        id: 10,
        group: "A",
        date: "2026-06-12T00:00:00.000Z",
        statusShort: "NS",
        home: { id: 1, name: "Alpha" },
        away: { id: 2, name: "Beta" },
        goals: { home: null, away: null },
      },
    ],
    predictions: {
      10: { home: 2, away: 1, source: "odds" },
    },
    marketEvidence: {
      10: { updatedAtUtc: "2026-06-22T21:00:00.000Z" },
    },
  };
  state.predictions[10] = { home: "", away: "", source: "manual" };

  normalizeLocalSeed(seed);

  assert.deepEqual(plain(getFixtureScore(state.fixtures[0])), { home: 2, away: 1, source: "odds" });
  assert.deepEqual(plain(state.marketEvidence[10]), { updatedAtUtc: "2026-06-22T21:00:00.000Z" });
});

test("knockout bracket includes round-of-32 venues and later match paths", () => {
  const { ROUND_OF_32, KNOCKOUT_ROUNDS } = loadApp();

  assert.equal(ROUND_OF_32.length, 16);
  assert.deepEqual(
    plain(ROUND_OF_32.map((match) => match.match)),
    [
      "M73",
      "M74",
      "M75",
      "M76",
      "M77",
      "M78",
      "M79",
      "M80",
      "M81",
      "M82",
      "M83",
      "M84",
      "M85",
      "M86",
      "M87",
      "M88",
    ]
  );
  assert.equal(ROUND_OF_32.find((match) => match.match === "M73").city, "Inglewood, USA");
  assert.equal(ROUND_OF_32.find((match) => match.match === "M83").venue, "Toronto Stadium");
  assert.deepEqual(
    plain(KNOCKOUT_ROUNDS.map((round) => round.matches.length)),
    [16, 8, 4, 2, 2]
  );
  assert.deepEqual(plain(KNOCKOUT_ROUNDS[1].matches[0]), {
    match: "M89",
    home: "W74",
    away: "W77",
    dateLabel: "Jul 4",
    venue: "Philadelphia Stadium",
    city: "Philadelphia, USA",
  });
});

test("future bracket candidate labels use compact country abbreviations", () => {
  const { teamShortName } = loadApp();

  assert.equal(teamShortName({ name: "Portugal" }), "POR");
  assert.equal(teamShortName({ name: "Bosnia & Herzegovina" }), "BIH");
  assert.equal(teamShortName({ name: "Curaçao" }), "CUW");
});

test("team flags are explicit for known countries and absent for placeholders", () => {
  const { teamFlagEmoji } = loadApp();

  assert.equal(teamFlagEmoji({ name: "Spain" }), "🇪🇸");
  assert.equal(teamFlagEmoji({ name: "South Korea" }), "🇰🇷");
  assert.equal(teamFlagEmoji({ name: "TBD" }), "");
  assert.equal(teamFlagEmoji({ name: "Placeholder" }), "");
  assert.equal(teamFlagEmoji({ name: "Not a country" }), "");
});

test("watch items treat odds fallback noise as non-critical", () => {
  const { isCriticalWarning } = loadApp();

  assert.equal(
    isCriticalWarning("Correct Score unavailable for Czech Republic vs Mexico; using 1x2_totals_spread market mode."),
    false
  );
  assert.equal(isCriticalWarning("oddsApiIo: No Odds-API.io events matched eligible fixtures."), false);
  assert.equal(isCriticalWarning("Odds missing for Czech Republic vs Mexico."), true);
  assert.equal(
    isCriticalWarning("Brazil and Japan are tied on the eighth third-place cutoff before conduct score/FIFA ranking."),
    true
  );
});
