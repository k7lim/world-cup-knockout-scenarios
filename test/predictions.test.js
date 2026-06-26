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
    computeTeamPathScenarios,
    annexeDestinationsForThirdGroup,
    importantMatchesForPathScenario,
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

function seedGroups(state, namesByGroup = {}) {
  const teamsByGroup = new Map();
  for (const group of "ABCDEFGHIJKL") {
    const names =
      namesByGroup[group] ||
      [`${group} One`, `${group} Two`, `${group} Three`, `${group} Four`];
    const teams = names.map((name, index) => ({
      id: group.charCodeAt(0) * 10 + index,
      name,
      group,
      officialRank: index + 1,
    }));
    teamsByGroup.set(group, teams);
    state.standingsGroups.set(group, teams);
    for (const team of teams) {
      state.teamMeta.set(team.id, { id: team.id, name: team.name, logo: "" });
      state.teamGroup.set(team.id, group);
    }
  }
  return teamsByGroup;
}

function addFixture(fixtures, teamsByGroup, group, homeIndex, awayIndex, home, away, statusShort = "FT") {
  const teams = teamsByGroup.get(group);
  const fixture = {
    id: fixtures.length + 1000,
    group,
    date: `2026-06-${String(fixtures.length + 1).padStart(2, "0")}T20:00:00.000Z`,
    statusShort,
    goals: statusShort === "FT" ? { home, away } : { home: null, away: null },
    home: teams[homeIndex],
    away: teams[awayIndex],
  };
  fixtures.push(fixture);
  return fixture;
}

function addProjectedGroup(fixtures, teamsByGroup, predictions, group, highThird = true) {
  const scores = highThird
    ? [
        [0, 1, 2, 0],
        [0, 2, 2, 0],
        [0, 3, 2, 0],
        [1, 2, 1, 0],
        [1, 3, 1, 0],
        [2, 3, 1, 0],
      ]
    : [
        [0, 1, 2, 0],
        [0, 2, 2, 0],
        [0, 3, 2, 0],
        [1, 2, 2, 0],
        [1, 3, 2, 0],
        [2, 3, 0, 0],
      ];
  for (const [homeIndex, awayIndex, home, away] of scores) {
    const fixture = addFixture(fixtures, teamsByGroup, group, homeIndex, awayIndex, null, null, "NS");
    predictions[fixture.id] = { home, away, source: "manual" };
  }
}

function seedAnnexePathScenario(state) {
  const teamsByGroup = seedGroups(state, {
    B: ["B One", "B Two", "Bosnia & Herzegovina", "B Four"],
    D: ["USA", "Australia", "Paraguay", "Turkey"],
  });
  const fixtures = [];

  addFixture(fixtures, teamsByGroup, "D", 0, 1, 2, 0);
  addFixture(fixtures, teamsByGroup, "D", 0, 2, 4, 1);
  addFixture(fixtures, teamsByGroup, "D", 0, 3, 1, 0);
  addFixture(fixtures, teamsByGroup, "D", 1, 2, 2, 0);
  addFixture(fixtures, teamsByGroup, "D", 1, 3, 2, 0);
  addFixture(fixtures, teamsByGroup, "D", 2, 3, 0, 0);

  for (const group of "ABCEFGHIJKL") {
    addProjectedGroup(fixtures, teamsByGroup, state.predictions, group, "BFGHIJKL".includes(group));
  }

  state.fixtures = fixtures;
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

test("same-group ranking uses head-to-head before overall goal difference", () => {
  const { state, computeTournament } = loadApp();
  const teamsByGroup = seedGroups(state, {
    D: ["USA", "Australia", "Paraguay", "Turkey"],
  });
  const fixtures = [];
  addFixture(fixtures, teamsByGroup, "D", 0, 2, 4, 1);
  addFixture(fixtures, teamsByGroup, "D", 1, 3, 2, 0);
  addFixture(fixtures, teamsByGroup, "D", 0, 1, 2, 0);
  addFixture(fixtures, teamsByGroup, "D", 3, 2, 0, 1);
  const turkeyUsa = addFixture(fixtures, teamsByGroup, "D", 3, 0, null, null, "NS");
  const paraguayAustralia = addFixture(fixtures, teamsByGroup, "D", 2, 1, null, null, "NS");
  state.fixtures = fixtures;
  state.predictions[turkeyUsa.id] = { home: 1, away: 0, source: "manual" };
  state.predictions[paraguayAustralia.id] = { home: 0, away: 5, source: "manual" };

  const groupD = computeTournament().rankedGroups.get("D");

  assert.deepEqual(
    plain(groupD.slice(0, 2).map((team) => ({ name: team.name, points: team.points, gd: team.gd }))),
    [
      { name: "USA", points: 6, gd: 4 },
      { name: "Australia", points: 6, gd: 5 },
    ]
  );
});

test("Annexe C almost always sends qualifying Group B third place to 1D", () => {
  const { state, annexeDestinationsForThirdGroup } = loadApp();
  state.annexe = require("../data/annexe-c.json");

  const destinations = annexeDestinationsForThirdGroup("B");

  assert.equal(destinations.total, 330);
  assert.deepEqual(plain(destinations.slots["1D"]), { count: 329, exceptions: ["BEGHIJKL"] });
  assert.deepEqual(plain(destinations.slots["1E"]), { count: 1, exceptions: [] });
});

test("team path scenarios mark a completed fourth-place team as eliminated", () => {
  const { state, computeTournament, computeTeamPathScenarios } = loadApp();
  const teams = [
    { id: 1, name: "Alpha", group: "A", officialRank: 1 },
    { id: 2, name: "Beta", group: "A", officialRank: 2 },
    { id: 3, name: "Gamma", group: "A", officialRank: 3 },
    { id: 4, name: "Delta", group: "A", officialRank: 4 },
  ];
  state.standingsGroups.set("A", teams);
  state.fixtures = [
    { id: 10, group: "A", statusShort: "FT", goals: { home: 1, away: 0 }, home: teams[0], away: teams[1] },
    { id: 11, group: "A", statusShort: "FT", goals: { home: 2, away: 0 }, home: teams[0], away: teams[2] },
    { id: 12, group: "A", statusShort: "FT", goals: { home: 2, away: 0 }, home: teams[0], away: teams[3] },
    { id: 13, group: "A", statusShort: "FT", goals: { home: 1, away: 0 }, home: teams[1], away: teams[2] },
    { id: 14, group: "A", statusShort: "FT", goals: { home: 1, away: 0 }, home: teams[1], away: teams[3] },
    { id: 15, group: "A", statusShort: "FT", goals: { home: 1, away: 0 }, home: teams[2], away: teams[3] },
  ];

  const scenario = computeTeamPathScenarios("Delta", computeTournament());

  assert.equal(scenario.status.kind, "eliminated");
  assert.equal(scenario.status.label, "Eliminated");
  assert.deepEqual(plain(scenario.opponentDistribution), []);
  assert.match(scenario.eliminationReasons.join(" "), /completed Group A in 4th/);
});

test("USA path scenarios show alternative Annexe opponents and concrete change drivers", () => {
  const { state, computeTournament, computeTeamPathScenarios, importantMatchesForPathScenario } = loadApp();
  state.annexe = require("../data/annexe-c.json");
  seedAnnexePathScenario(state);

  const scenario = computeTeamPathScenarios("USA", computeTournament());
  const bosnia = scenario.opponentDistribution.find((entry) => entry.teamName === "Bosnia & Herzegovina");

  assert.equal(scenario.status.kind, "clinched");
  assert.equal(scenario.status.label, "Clinched 1D");
  assert.ok(scenario.opponentDistribution.length > 1);
  assert.equal(bosnia.count, 329);
  assert.equal(bosnia.total, 495);
  assert.equal(bosnia.currentProjection, true);
  assert.match(scenario.changeDrivers.join(" "), /BEGHIJKL/);
  assert.match(scenario.changeDrivers.join(" "), /Group I/);

  const matchesThatMatter = importantMatchesForPathScenario(scenario, computeTournament());
  const groupsByReason = matchesThatMatter.map((item) => `${item.fixture.group}:${item.reason}`);
  assert.ok(groupsByReason.some((item) => item.startsWith("E:Can send Group E third-place team to 1D")));
  assert.ok(groupsByReason.some((item) => item.startsWith("F:Can send Group F third-place team to 1D")));
  assert.ok(groupsByReason.some((item) => item.startsWith("I:Can send Group I third-place team to 1D")));
  assert.ok(groupsByReason.some((item) => item.startsWith("J:Can send Group J third-place team to 1D")));
  assert.equal(groupsByReason.some((item) => item === "D:Can change USA's slot"), false);
  assert.ok(matchesThatMatter.some((item) => item.category === "third-place-cutoff"));
});

test("Annexe opponent scenarios exclude completed third-place groups that are mathematically out", () => {
  const { state, computeTournament, computeTeamPathScenarios, importantMatchesForPathScenario } = loadApp();
  const teamsByGroup = new Map();
  const fixtures = [];
  let fixtureId = 1000;
  for (const group of "ABCDEFGHIJKL") {
    const names =
      group === "D"
        ? ["USA", "Australia", "Paraguay", "Turkey"]
        : [`${group} One`, `${group} Two`, `${group} Three`, `${group} Four`];
    const teams = names.map((name, index) => ({
      id: group.charCodeAt(0) * 10 + index,
      name,
      group,
      officialRank: index + 1,
    }));
    teamsByGroup.set(group, teams);
    state.standingsGroups.set(group, teams);
  }

  function addFixture(group, homeIndex, awayIndex, home, away, statusShort = "FT") {
    const teams = teamsByGroup.get(group);
    fixtures.push({
      id: fixtureId++,
      group,
      statusShort,
      goals: statusShort === "FT" ? { home, away } : { home: null, away: null },
      home: teams[homeIndex],
      away: teams[awayIndex],
    });
  }

  function completeNormalGroup(group) {
    addFixture(group, 0, 1, 2, 0);
    addFixture(group, 0, 2, 2, 0);
    addFixture(group, 0, 3, 2, 0);
    addFixture(group, 1, 2, 1, 0);
    addFixture(group, 1, 3, 1, 0);
    addFixture(group, 2, 3, 1, 0);
  }

  function completeLowThirdGroup(group) {
    addFixture(group, 0, 1, 2, 0);
    addFixture(group, 0, 2, 2, 0);
    addFixture(group, 0, 3, 2, 0);
    addFixture(group, 1, 2, 1, 0);
    addFixture(group, 1, 3, 1, 0);
    addFixture(group, 2, 3, 0, 0);
  }

  function addOpenGroup(group) {
    addFixture(group, 0, 1, null, null, "NS");
    addFixture(group, 0, 2, null, null, "NS");
    addFixture(group, 1, 2, null, null, "NS");
  }

  for (const group of "ABCDEFGH") completeNormalGroup(group);
  completeLowThirdGroup("I");
  for (const group of "JKL") addOpenGroup(group);
  state.fixtures = fixtures;
  state.annexe = require("../data/annexe-c.json");

  const scenario = computeTeamPathScenarios("USA", computeTournament());
  const matchesThatMatter = importantMatchesForPathScenario(scenario, computeTournament());

  assert.equal(scenario.annexeConstraints.excluded.includes("I"), true);
  assert.equal(scenario.opponentDistribution.some((entry) => entry.slot === "3I"), false);
  assert.equal(matchesThatMatter.some((item) => item.group === "I" && item.category === "annexe-source"), false);
  assert.equal(matchesThatMatter.some((item) => item.group === "B" && item.category === "projected-opponent"), false);
  assert.equal(scenario.opponentDistribution[0].total, 165);
  assert.deepEqual(
    plain(scenario.opponentDistribution.map((entry) => [entry.slot, entry.count])),
    [
      ["3B", 120],
      ["3J", 27],
      ["3E", 13],
      ["3F", 5],
    ]
  );
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
