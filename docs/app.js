const GROUPS = "ABCDEFGHIJKL".split("");
const TEAM_ABBREVIATIONS = new Map(
  Object.entries({
    Algeria: "ALG",
    Argentina: "ARG",
    Australia: "AUS",
    Austria: "AUT",
    Belgium: "BEL",
    "Bosnia & Herzegovina": "BIH",
    Brazil: "BRA",
    Canada: "CAN",
    "Cape Verde": "CPV",
    Colombia: "COL",
    Croatia: "CRO",
    Curacao: "CUW",
    "Czech Republic": "CZE",
    "DR Congo": "COD",
    Ecuador: "ECU",
    Egypt: "EGY",
    England: "ENG",
    France: "FRA",
    Germany: "GER",
    Ghana: "GHA",
    Haiti: "HAI",
    Iran: "IRN",
    Iraq: "IRQ",
    "Ivory Coast": "CIV",
    Japan: "JPN",
    Jordan: "JOR",
    Mexico: "MEX",
    Morocco: "MAR",
    Netherlands: "NED",
    "New Zealand": "NZL",
    Norway: "NOR",
    Panama: "PAN",
    Paraguay: "PAR",
    Portugal: "POR",
    Qatar: "QAT",
    "Saudi Arabia": "KSA",
    Scotland: "SCO",
    Senegal: "SEN",
    "South Africa": "RSA",
    "South Korea": "KOR",
    Spain: "ESP",
    Sweden: "SWE",
    Switzerland: "SUI",
    Tunisia: "TUN",
    Turkey: "TUR",
    Uruguay: "URU",
    USA: "USA",
    Uzbekistan: "UZB",
  })
);
const TERMINAL_STATUSES = new Set(["FT", "AET", "PEN", "AWD", "WO"]);
const LIVE_STATUSES = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE"]);
const STORAGE_KEY = "wc2026-predictions-v1";
const EVIDENCE_STORAGE_KEY = "wc2026-market-evidence-v1";
const LOCAL_SEED_URL = "data/world-cup-2026-seed.json";

const ROUND_OF_32 = [
  {
    match: "M73",
    home: "2A",
    away: "2B",
    dateLabel: "Jun 28",
    venue: "Los Angeles Stadium",
    city: "Inglewood, USA",
  },
  {
    match: "M74",
    home: "1E",
    awaySlot: "1E",
    dateLabel: "Jun 29",
    venue: "Boston Stadium",
    city: "Foxborough, USA",
  },
  {
    match: "M75",
    home: "1F",
    away: "2C",
    dateLabel: "Jun 29",
    venue: "Monterrey Stadium",
    city: "Guadalupe, Mexico",
  },
  {
    match: "M76",
    home: "1C",
    away: "2F",
    dateLabel: "Jun 29",
    venue: "Houston Stadium",
    city: "Houston, USA",
  },
  {
    match: "M77",
    home: "1I",
    awaySlot: "1I",
    dateLabel: "Jun 30",
    venue: "New York New Jersey Stadium",
    city: "East Rutherford, USA",
  },
  {
    match: "M78",
    home: "2E",
    away: "2I",
    dateLabel: "Jun 30",
    venue: "Dallas Stadium",
    city: "Arlington, USA",
  },
  {
    match: "M79",
    home: "1A",
    awaySlot: "1A",
    dateLabel: "Jun 30",
    venue: "Mexico City Stadium",
    city: "Mexico City, Mexico",
  },
  {
    match: "M80",
    home: "1L",
    awaySlot: "1L",
    dateLabel: "Jul 1",
    venue: "Atlanta Stadium",
    city: "Atlanta, USA",
  },
  {
    match: "M81",
    home: "1D",
    awaySlot: "1D",
    dateLabel: "Jul 1",
    venue: "San Francisco Bay Area Stadium",
    city: "Santa Clara, USA",
  },
  {
    match: "M82",
    home: "1G",
    awaySlot: "1G",
    dateLabel: "Jul 1",
    venue: "Seattle Stadium",
    city: "Seattle, USA",
  },
  {
    match: "M83",
    home: "2K",
    away: "2L",
    dateLabel: "Jul 2",
    venue: "Toronto Stadium",
    city: "Toronto, Canada",
  },
  {
    match: "M84",
    home: "1H",
    away: "2J",
    dateLabel: "Jul 2",
    venue: "Los Angeles Stadium",
    city: "Inglewood, USA",
  },
  {
    match: "M85",
    home: "1B",
    awaySlot: "1B",
    dateLabel: "Jul 2",
    venue: "BC Place",
    city: "Vancouver, Canada",
  },
  {
    match: "M86",
    home: "1J",
    away: "2H",
    dateLabel: "Jul 3",
    venue: "Miami Stadium",
    city: "Miami Gardens, USA",
  },
  {
    match: "M87",
    home: "1K",
    awaySlot: "1K",
    dateLabel: "Jul 3",
    venue: "Kansas City Stadium",
    city: "Kansas City, USA",
  },
  {
    match: "M88",
    home: "2D",
    away: "2G",
    dateLabel: "Jul 3",
    venue: "Dallas Stadium",
    city: "Arlington, USA",
  },
];

const KNOCKOUT_ROUNDS = [
  {
    name: "Round of 32",
    matches: ROUND_OF_32,
  },
  {
    name: "Round of 16",
    matches: [
      { match: "M89", home: "W74", away: "W77", dateLabel: "Jul 4", venue: "Philadelphia Stadium", city: "Philadelphia, USA" },
      { match: "M90", home: "W73", away: "W75", dateLabel: "Jul 4", venue: "Houston Stadium", city: "Houston, USA" },
      { match: "M91", home: "W76", away: "W78", dateLabel: "Jul 5", venue: "New York New Jersey Stadium", city: "East Rutherford, USA" },
      { match: "M92", home: "W79", away: "W80", dateLabel: "Jul 5", venue: "Mexico City Stadium", city: "Mexico City, Mexico" },
      { match: "M93", home: "W83", away: "W84", dateLabel: "Jul 6", venue: "Dallas Stadium", city: "Arlington, USA" },
      { match: "M94", home: "W81", away: "W82", dateLabel: "Jul 6", venue: "Seattle Stadium", city: "Seattle, USA" },
      { match: "M95", home: "W86", away: "W88", dateLabel: "Jul 7", venue: "Atlanta Stadium", city: "Atlanta, USA" },
      { match: "M96", home: "W85", away: "W87", dateLabel: "Jul 7", venue: "BC Place", city: "Vancouver, Canada" },
    ],
  },
  {
    name: "Quarterfinals",
    matches: [
      { match: "M97", home: "W89", away: "W90", dateLabel: "Jul 9", venue: "Boston Stadium", city: "Foxborough, USA" },
      { match: "M98", home: "W93", away: "W94", dateLabel: "Jul 10", venue: "Los Angeles Stadium", city: "Inglewood, USA" },
      { match: "M99", home: "W91", away: "W92", dateLabel: "Jul 11", venue: "Miami Stadium", city: "Miami Gardens, USA" },
      { match: "M100", home: "W95", away: "W96", dateLabel: "Jul 11", venue: "Kansas City Stadium", city: "Kansas City, USA" },
    ],
  },
  {
    name: "Semifinals",
    matches: [
      { match: "M101", home: "W97", away: "W98", dateLabel: "Jul 14", venue: "Dallas Stadium", city: "Arlington, USA" },
      { match: "M102", home: "W99", away: "W100", dateLabel: "Jul 15", venue: "Atlanta Stadium", city: "Atlanta, USA" },
    ],
  },
  {
    name: "Finals",
    matches: [
      { match: "M103", home: "L101", away: "L102", dateLabel: "Jul 18", venue: "Miami Stadium", city: "Miami Gardens, USA", title: "Third place" },
      { match: "M104", home: "W101", away: "W102", dateLabel: "Jul 19", venue: "New York New Jersey Stadium", city: "East Rutherford, USA", title: "Final" },
    ],
  },
];

const CLASSIC_BRACKET_REGIONS = [
  {
    name: "Region 1",
    roundOf32: ["M74", "M77", "M73", "M75"],
    roundOf16: ["M89", "M90"],
    quarterfinal: "M97",
  },
  {
    name: "Region 2",
    roundOf32: ["M83", "M84", "M81", "M82"],
    roundOf16: ["M93", "M94"],
    quarterfinal: "M98",
  },
  {
    name: "Region 3",
    roundOf32: ["M76", "M78", "M79", "M80"],
    roundOf16: ["M91", "M92"],
    quarterfinal: "M99",
  },
  {
    name: "Region 4",
    roundOf32: ["M86", "M88", "M85", "M87"],
    roundOf16: ["M95", "M96"],
    quarterfinal: "M100",
  },
];

const els = {
  apiState: document.getElementById("apiState"),
  updatedAt: document.getElementById("updatedAt"),
  refreshBtn: document.getElementById("refreshBtn"),
  clearPredictionsBtn: document.getElementById("clearPredictionsBtn"),
  oddsStatus: document.getElementById("oddsStatus"),
  oddsProgress: document.getElementById("oddsProgress"),
  oddsProgressBar: document.getElementById("oddsProgressBar"),
  groupsTabBtn: document.getElementById("groupsTabBtn"),
  thirdTabBtn: document.getElementById("thirdTabBtn"),
  bracketTabBtn: document.getElementById("bracketTabBtn"),
  groupsTab: document.getElementById("groupsTab"),
  thirdTab: document.getElementById("thirdTab"),
  bracketTab: document.getElementById("bracketTab"),
  predictionModeToggle: document.getElementById("predictionModeToggle"),
  groupsModeLabel: document.getElementById("groupsModeLabel"),
  thirdModeLabel: document.getElementById("thirdModeLabel"),
  bracketModeLabel: document.getElementById("bracketModeLabel"),
  predictionHelpBtn: document.getElementById("predictionHelpBtn"),
  predictionHelp: document.getElementById("predictionHelp"),
  groupFilter: document.getElementById("groupFilter"),
  fixtureGroupFilter: document.getElementById("fixtureGroupFilter"),
  ticketMatchFilter: document.getElementById("ticketMatchFilter"),
  groupsGrid: document.getElementById("groupsGrid"),
  fixturesList: document.getElementById("fixturesList"),
  bracketGrid: document.getElementById("bracketGrid"),
  qualifiedCount: document.getElementById("qualifiedCount"),
  annexeOption: document.getElementById("annexeOption"),
  annexeBadge: document.getElementById("annexeBadge"),
  thirdPlaceList: document.getElementById("thirdPlaceList"),
  warningsHeading: document.getElementById("warningsHeading"),
  warningsList: document.getElementById("warningsList"),
};

const state = {
  annexe: [],
  fixtures: [],
  standingsGroups: new Map(),
  teamMeta: new Map(),
  teamGroup: new Map(),
  predictions: loadPredictions(),
  marketEvidence: loadMarketEvidence(),
  odds: new Map(),
  selectedGroup: "all",
  selectedFixtureGroup: "all",
  selectedTicketMatch: "all",
  activeTab: "groups",
  predictionsEnabled: true,
  useLiveScores: true,
  sourceLabel: "Not loaded",
  sourceUpdatedAtUtc: null,
  sourceMeta: null,
  sourceWarnings: [],
};

function loadPredictions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function savePredictions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.predictions));
}

function loadMarketEvidence() {
  try {
    return JSON.parse(localStorage.getItem(EVIDENCE_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveMarketEvidence() {
  localStorage.setItem(EVIDENCE_STORAGE_KEY, JSON.stringify(state.marketEvidence));
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatTime(iso) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function groupLetter(groupName) {
  const match = String(groupName || "").match(/Group\s+([A-L])/i);
  return match ? match[1].toUpperCase() : null;
}

function logoFor(team) {
  return team?.logo || state.teamMeta.get(team?.id)?.logo || "";
}

function normalizedTeamName(name) {
  return String(name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function teamShortName(team) {
  const normalized = normalizedTeamName(team?.name);
  const mapped = TEAM_ABBREVIATIONS.get(normalized);
  if (mapped) return mapped;
  const words = normalized.match(/[A-Za-z]+/g) || [];
  if (words.length >= 2) return words.map((word) => word[0]).join("").slice(0, 3).toUpperCase();
  return normalized.slice(0, 3).toUpperCase() || "TBD";
}

function safeNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function hasUsablePrediction(prediction) {
  return safeNumber(prediction?.home) !== null || safeNumber(prediction?.away) !== null;
}

function isLockedFixture(fixture) {
  return TERMINAL_STATUSES.has(fixture.statusShort) && fixture.goals.home !== null && fixture.goals.away !== null;
}

function isLiveFixture(fixture) {
  return LIVE_STATUSES.has(fixture.statusShort) && fixture.goals.home !== null && fixture.goals.away !== null;
}

function normalizeLocalSeed(seed) {
  state.standingsGroups = new Map();
  state.teamMeta = new Map();
  state.teamGroup = new Map();
  state.sourceLabel = seed.source?.name || "GitHub source";
  state.sourceUpdatedAtUtc = seed.updatedAtUtc;
  state.sourceMeta = seed.source || null;
  state.sourceWarnings = [];

  for (const group of seed.groups || []) {
    const letter = group.letter || groupLetter(group.name);
    if (!letter) continue;
    const teams = (group.teams || []).map((team, index) => ({
      id: team.id,
      name: team.name,
      logo: team.logo || "",
      officialRank: team.seedRank || index + 1,
      group: letter,
    }));
    state.standingsGroups.set(letter, teams);
    for (const team of teams) {
      state.teamGroup.set(team.id, letter);
      state.teamMeta.set(team.id, {
        id: team.id,
        name: team.name,
        logo: team.logo,
      });
    }
  }

  state.fixtures = (seed.fixtures || [])
    .map((fixture) => ({
      id: fixture.id,
      date: fixture.date,
      venue: fixture.venue || {},
      round: fixture.round || "Group Stage",
      group: fixture.group,
      statusShort: fixture.statusShort || "NS",
      statusLong: fixture.statusLong || "Not Started",
      home: {
        id: fixture.home?.id,
        name: fixture.home?.name || "TBD",
        logo: fixture.home?.logo || state.teamMeta.get(fixture.home?.id)?.logo || "",
      },
      away: {
        id: fixture.away?.id,
        name: fixture.away?.name || "TBD",
        logo: fixture.away?.logo || state.teamMeta.get(fixture.away?.id)?.logo || "",
      },
      goals: {
        home: fixture.goals?.home ?? null,
        away: fixture.goals?.away ?? null,
      },
    }))
    .filter((fixture) => fixture.group);

  populateGroupFilters();
  populateTicketFilter();
  const imported = applyOddsImport(seed, "syncOdds", { persist: false });
  state.sourceWarnings = evidenceWarningsFromResponse(seed);
  if (imported.applied || imported.skipped) {
    savePredictions();
    saveMarketEvidence();
  }
}

function populateGroupFilters() {
  const options = ['<option value="all">All groups</option>']
    .concat(GROUPS.map((group) => `<option value="${group}">Group ${group}</option>`))
    .join("");
  els.groupFilter.innerHTML = options;
  els.fixtureGroupFilter.innerHTML = options;
  els.groupFilter.value = state.selectedGroup;
  els.fixtureGroupFilter.value = state.selectedFixtureGroup;
}

function populateTicketFilter() {
  const options = ['<option value="all">All knockout matches</option>'];
  for (const round of KNOCKOUT_ROUNDS) {
    for (const match of round.matches) {
      options.push(
        `<option value="${match.match}">${match.match} - ${match.dateLabel} - ${match.city}</option>`
      );
    }
  }
  els.ticketMatchFilter.innerHTML = options.join("");
  els.ticketMatchFilter.value = state.selectedTicketMatch;
}

function getFixtureScore(fixture, options = {}) {
  if (isLockedFixture(fixture)) {
    return { home: fixture.goals.home, away: fixture.goals.away, source: "locked" };
  }

  if (options.playedOnly) {
    return { home: null, away: null, source: "empty" };
  }

  if (options.includePredictions !== false) {
    const prediction = state.predictions[fixture.id];
    const home = safeNumber(prediction?.home);
    const away = safeNumber(prediction?.away);

    if (prediction && (home !== null || away !== null)) {
      return { home, away, source: prediction.source || "predicted" };
    }
  }

  if (state.useLiveScores && isLiveFixture(fixture)) {
    return { home: fixture.goals.home, away: fixture.goals.away, source: "live" };
  }

  return { home: null, away: null, source: "empty" };
}

function emptyTeamStats(team) {
  return {
    id: team.id,
    name: team.name,
    logo: logoFor(team),
    group: team.group,
    officialRank: team.officialRank || 999,
    played: 0,
    win: 0,
    draw: 0,
    lose: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    points: 0,
  };
}

function applyResult(table, homeTeam, awayTeam, homeGoals, awayGoals) {
  const home = table.get(homeTeam.id);
  const away = table.get(awayTeam.id);
  if (!home || !away) return;

  home.played += 1;
  away.played += 1;
  home.gf += homeGoals;
  home.ga += awayGoals;
  away.gf += awayGoals;
  away.ga += homeGoals;
  home.gd = home.gf - home.ga;
  away.gd = away.gf - away.ga;

  if (homeGoals > awayGoals) {
    home.win += 1;
    away.lose += 1;
    home.points += 3;
  } else if (awayGoals > homeGoals) {
    away.win += 1;
    home.lose += 1;
    away.points += 3;
  } else {
    home.draw += 1;
    away.draw += 1;
    home.points += 1;
    away.points += 1;
  }
}

function rankRows(a, b) {
  return (
    b.points - a.points ||
    b.gd - a.gd ||
    b.gf - a.gf ||
    a.officialRank - b.officialRank ||
    a.name.localeCompare(b.name)
  );
}

function computeTournament(options = {}) {
  const warnings = [...state.sourceWarnings];
  const groupTables = new Map();
  warnings.push(...oddsWarnings());

  for (const group of GROUPS) {
    const teams = state.standingsGroups.get(group) || [];
    const table = new Map();
    for (const team of teams) table.set(team.id, emptyTeamStats(team));
    groupTables.set(group, table);
  }

  for (const fixture of state.fixtures) {
    const score = getFixtureScore(fixture, options);
    if (score.home === null || score.away === null) continue;
    applyResult(
      groupTables.get(fixture.group),
      fixture.home,
      fixture.away,
      score.home,
      score.away
    );
  }

  const rankedGroups = new Map();
  const winners = new Map();
  const runnersUp = new Map();
  const thirds = [];

  for (const group of GROUPS) {
    const rows = Array.from(groupTables.get(group)?.values() || []).sort(rankRows);
    rankedGroups.set(group, rows);
    if (rows[0]) winners.set(group, rows[0]);
    if (rows[1]) runnersUp.set(group, rows[1]);
    if (rows[2]) thirds.push({ ...rows[2], rankInGroup: 3 });

    for (let index = 0; index < rows.length - 1; index += 1) {
      const left = rows[index];
      const right = rows[index + 1];
      if (
        left.points === right.points &&
        left.gd === right.gd &&
        left.gf === right.gf &&
        index <= 2
      ) {
        warnings.push(
          `Group ${group}: ${left.name} and ${right.name} are tied on points, goal difference, and goals scored near the qualification line.`
        );
      }
    }
  }

  const thirdRankings = thirds.sort(rankRows);
  const thirdQualifierGroups = thirdRankings
    .slice(0, 8)
    .map((team) => team.group)
    .sort()
    .join("");
  const annexeRow = state.annexe.find((row) => row.qualifiers === thirdQualifierGroups);

  const boundaryA = thirdRankings[7];
  const boundaryB = thirdRankings[8];
  if (
    boundaryA &&
    boundaryB &&
    boundaryA.points === boundaryB.points &&
    boundaryA.gd === boundaryB.gd &&
    boundaryA.gf === boundaryB.gf
  ) {
    warnings.push(
      `${boundaryA.name} and ${boundaryB.name} are tied on the eighth third-place cutoff before conduct score/FIFA ranking.`
    );
  }

  const qualifiedTeams = [
    ...Array.from(winners.values()),
    ...Array.from(runnersUp.values()),
    ...thirdRankings.slice(0, 8),
  ].filter(Boolean);

  return {
    rankedGroups,
    winners,
    runnersUp,
    thirdRankings,
    thirdQualifierGroups,
    annexeRow,
    qualifiedTeams,
    warnings,
  };
}

function oddsWarnings() {
  const warnings = [];
  const now = Date.now();
  for (const [fixtureId, evidence] of Object.entries(state.marketEvidence || {})) {
    const fixture = state.fixtures.find((candidate) => String(candidate.id) === String(fixtureId));
    if (!fixture) continue;
    const label = `${fixture.home.name} vs ${fixture.away.name}`;
    const updatedAt = Date.parse(evidence.updatedAtUtc || "");
    if (
      evidence.stale ||
      (Number.isFinite(updatedAt) && evidence.staleAfterMs && now - updatedAt > evidence.staleAfterMs)
    ) {
      warnings.push(`Stale odds for ${label}; refresh before relying on this prediction.`);
    }
    if (evidence.fallbackUsed || evidence.marketUsed !== "correct_score") {
      warnings.push(`Correct Score unavailable for ${label}; using ${evidence.marketUsed || "fallback"} market mode.`);
    }
    if ((evidence.bookmakerCount || 0) < 2) {
      warnings.push(`Bookmaker count below 2 for ${label}.`);
    }
  }
  return warnings;
}

function renderTeamCell(team) {
  const wrap = el("div", "team-cell");
  if (team?.logo) {
    const img = el("img");
    img.src = team.logo;
    img.alt = "";
    wrap.appendChild(img);
  }
  wrap.appendChild(el("span", "team-name", team?.name || "TBD"));
  return wrap;
}

function renderGroups(model) {
  els.groupsGrid.innerHTML = "";
  const groups = state.selectedGroup === "all" ? GROUPS : [state.selectedGroup];

  if (!state.standingsGroups.size) {
    els.groupsGrid.appendChild(emptyState());
    return;
  }

  for (const group of groups) {
    const rows = model.rankedGroups.get(group) || [];
    const card = el("article", "group-table");
    const title = el("div", "group-title");
    title.appendChild(el("strong", "", `Group ${group}`));
    title.appendChild(el("span", "", `${rows.length} teams`));
    card.appendChild(title);

    const table = el("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th></th>
          <th class="team-col">Team</th>
          <th>MP</th>
          <th>GD</th>
          <th>GF</th>
          <th>Pts</th>
        </tr>
      </thead>
    `;
    const body = el("tbody");

    rows.forEach((team, index) => {
      const row = el("tr", `rank-${index + 1}`);
      const rank = el("td");
      rank.appendChild(el("span", "rank-pill", String(index + 1)));
      const teamTd = el("td", "team-col");
      teamTd.appendChild(renderTeamCell(team));
      row.append(rank, teamTd);
      row.appendChild(el("td", "", String(team.played)));
      row.appendChild(el("td", "", String(team.gd)));
      row.appendChild(el("td", "", String(team.gf)));
      row.appendChild(el("td", "", String(team.points)));
      body.appendChild(row);
    });

    table.appendChild(body);
    card.appendChild(table);
    els.groupsGrid.appendChild(card);
  }
}

function sourceLabel(source) {
  if (source === "locked") return "Official";
  if (source === "live") return "Live";
  if (source === "odds") return "Odds";
  if (source === "manual") return "Manual";
  return "Empty";
}

function sourceClass(source) {
  if (source === "locked") return "locked";
  if (source === "live") return "live";
  if (source === "empty") return "empty";
  return "predicted";
}

function renderFixtures() {
  els.fixturesList.innerHTML = "";
  const fixtures = state.fixtures
    .filter((fixture) => state.selectedFixtureGroup === "all" || fixture.group === state.selectedFixtureGroup)
    .filter((fixture) => !isLockedFixture(fixture))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (!fixtures.length) {
    els.fixturesList.appendChild(emptyState("No fixtures match the current filter."));
    return;
  }

  for (const fixture of fixtures) {
    const score = getFixtureScore(fixture);
    const locked = score.source === "locked";
    const card = el("article", `fixture-card ${locked ? "locked" : ""}`);

    const home = el("div", "fixture-team");
    home.appendChild(teamLogo(fixture.home));
    home.appendChild(el("span", "team-name", fixture.home.name));

    const away = el("div", "fixture-team away");
    away.appendChild(el("span", "team-name", fixture.away.name));
    away.appendChild(teamLogo(fixture.away));

    const scoreBox = el("div", "score-editor");
    const homeInput = scoreInput(fixture, "home", score, locked);
    const awayInput = scoreInput(fixture, "away", score, locked);
    scoreBox.append(homeInput, el("span", "", "-"), awayInput);

    const meta = el("div", "fixture-meta");
    meta.appendChild(el("strong", "", predictionSummary(fixture, score)));
    meta.appendChild(el("span", "", `Group ${fixture.group} | ${formatTime(fixture.date)}`));
    meta.appendChild(el("span", `source-pill ${sourceClass(score.source)}`, sourceLabel(score.source)));

    card.append(home, scoreBox, away, meta);
    els.fixturesList.appendChild(card);
  }
}

function predictionSummary(fixture, score) {
  if (score.home === null || score.away === null) return "Prediction pending";
  const scoreline = `${fixture.home.name} ${score.home}-${score.away} ${fixture.away.name}`;
  if (score.home > score.away) return `Favored: ${fixture.home.name} | ${scoreline}`;
  if (score.away > score.home) return `Favored: ${fixture.away.name} | ${scoreline}`;
  return `Favored: Draw | ${scoreline}`;
}

function teamLogo(team) {
  const img = el("img", "team-logo");
  img.src = logoFor(team);
  img.alt = "";
  img.onerror = () => img.remove();
  return img;
}

function updatePredictionFromInput(fixture, side, rawValue, displayedScore) {
  const existing = state.predictions[fixture.id] || {};
  const base =
    displayedScore && displayedScore.source !== "empty"
      ? {
          home: displayedScore.home ?? "",
          away: displayedScore.away ?? "",
        }
      : {};
  const next = {
    home: existing.home ?? base.home ?? "",
    away: existing.away ?? base.away ?? "",
    source: "manual",
    [side]: rawValue,
  };

  if (next.home === "" && next.away === "") {
    delete state.predictions[fixture.id];
    delete state.marketEvidence[fixture.id];
  } else {
    state.predictions[fixture.id] = next;
    delete state.marketEvidence[fixture.id];
  }
}

function scoreInput(fixture, side, score, locked) {
  const input = el("input");
  input.type = "number";
  input.min = "0";
  input.max = "20";
  input.inputMode = "numeric";
  input.value = score[side] ?? "";
  input.disabled = locked;
  input.ariaLabel = `${fixture[side].name} score`;
  input.addEventListener("change", () => {
    updatePredictionFromInput(fixture, side, input.value, score);
    savePredictions();
    saveMarketEvidence();
    renderAll();
  });
  return input;
}

function resolveSlot(slot, model) {
  if (!slot) return null;
  if (slot.startsWith("1")) return model.winners.get(slot[1]);
  if (slot.startsWith("2")) return model.runnersUp.get(slot[1]);
  if (slot.startsWith("3")) {
    return model.thirdRankings.find((team) => team.group === slot[1]);
  }
  return null;
}

function renderBracket(model) {
  els.bracketGrid.innerHTML = "";
  els.bracketGrid.className =
    state.selectedTicketMatch === "all" ? "bracket-grid classic" : "bracket-grid single-match";
  const matchLookup = new Map();

  for (const round of KNOCKOUT_ROUNDS) {
    for (const match of round.matches) {
      matchLookup.set(match.match, match);
    }
  }

  if (state.selectedTicketMatch === "all") {
    renderClassicBracket(model, matchLookup);
    return;
  }

  for (const [roundIndex, round] of KNOCKOUT_ROUNDS.entries()) {
    const matches = round.matches.filter((match) => match.match === state.selectedTicketMatch);
    if (!matches.length) continue;

    const column = el("section", `bracket-round bracket-round-${roundIndex + 1}`);
    column.appendChild(el("h3", "", round.name));

    const list = el("div", "bracket-round-list");
    for (const match of matches) {
      list.appendChild(renderKnockoutMatch(match, model, matchLookup));
    }

    column.appendChild(list);
    els.bracketGrid.appendChild(column);
  }
}

function renderRoundColumnsBracket(model, matchLookup) {
  for (const [roundIndex, round] of KNOCKOUT_ROUNDS.entries()) {
    const column = el("section", `bracket-round bracket-round-${roundIndex + 1}`);
    column.appendChild(el("h3", "", round.name));

    const list = el("div", "bracket-round-list");
    for (const match of round.matches) {
      list.appendChild(renderKnockoutMatch(match, model, matchLookup));
    }

    column.appendChild(list);
    els.bracketGrid.appendChild(column);
  }
}

function renderClassicBracket(model, matchLookup) {
  const regions = el("div", "bracket-regions");
  for (const region of CLASSIC_BRACKET_REGIONS) {
    regions.appendChild(renderBracketRegion(region, model, matchLookup));
  }
  els.bracketGrid.appendChild(regions);

  const finals = el("section", "finals-lane");
  finals.appendChild(el("h3", "", "Final Four"));

  const finalsGrid = el("div", "finals-grid");
  finalsGrid.appendChild(renderFinalsHeading("Semifinals", 1));
  finalsGrid.appendChild(renderFinalsHeading("Championship", 2));
  finalsGrid.appendChild(renderFinalsHeading("Third Place", 3));
  finalsGrid.appendChild(renderFinalsMatch(matchLookup.get("M101"), model, matchLookup, "finals-slot-semi", 1, 2));
  finalsGrid.appendChild(renderFinalsMatch(matchLookup.get("M102"), model, matchLookup, "finals-slot-semi", 1, 3));
  finalsGrid.appendChild(renderFinalsMatch(matchLookup.get("M104"), model, matchLookup, "finals-slot-final", 2, 2, 2));
  finalsGrid.appendChild(renderFinalsMatch(matchLookup.get("M103"), model, matchLookup, "finals-slot-third", 3, 2, 2));
  finals.appendChild(finalsGrid);
  els.bracketGrid.appendChild(finals);
}

function renderFinalsHeading(text, column) {
  const heading = el("h4", "finals-heading", text);
  heading.style.gridColumn = String(column);
  return heading;
}

function renderFinalsMatch(match, model, matchLookup, className, column, row, span = 1) {
  const slot = el("div", `finals-slot ${className}`);
  slot.style.gridColumn = String(column);
  slot.style.gridRow = `${row} / span ${span}`;

  const card = renderKnockoutMatch(match, model, matchLookup);
  slot.appendChild(card);
  return slot;
}

function renderBracketRegion(region, model, matchLookup) {
  const section = el("section", "bracket-region");
  section.appendChild(el("h3", "", region.name));

  const header = el("div", "region-header");
  header.appendChild(el("span", "", "Round of 32"));
  header.appendChild(el("span", "", "Round of 16"));
  header.appendChild(el("span", "", "Quarterfinal"));
  section.appendChild(header);

  const grid = el("div", "region-bracket");
  region.roundOf32.forEach((matchId, index) => {
    grid.appendChild(renderRegionMatch(matchLookup.get(matchId), model, matchLookup, "region-slot-r32", 1, index + 1));
  });
  region.roundOf16.forEach((matchId, index) => {
    grid.appendChild(renderRegionMatch(matchLookup.get(matchId), model, matchLookup, "region-slot-r16", 2, index * 2 + 1, 2));
  });
  grid.appendChild(renderRegionMatch(matchLookup.get(region.quarterfinal), model, matchLookup, "region-slot-qf", 3, 1, 4));

  section.appendChild(grid);
  return section;
}

function renderRegionMatch(match, model, matchLookup, className, column, row, span = 1) {
  const slot = el("div", `region-slot ${className}`);
  slot.style.gridColumn = String(column);
  slot.style.gridRow = `${row} / span ${span}`;

  const card = renderKnockoutMatch(match, model, matchLookup);
  slot.appendChild(card);
  return slot;
}

function resolvedAwaySlot(match, model) {
  return match.awaySlot ? model.annexeRow?.slots?.[match.awaySlot] : match.away;
}

function renderKnockoutMatch(match, model, matchLookup) {
  const homeSlot = match.home;
  const awaySlot = resolvedAwaySlot(match, model);
  const card = el("article", "match-card");
  const head = el("div", "match-head");
  head.appendChild(el("span", "", match.title || match.match));
  head.appendChild(el("span", "", match.dateLabel || ""));
  card.appendChild(head);

  const location = el("div", "match-location");
  location.appendChild(el("strong", "", match.venue));
  location.appendChild(el("span", "", match.city));
  card.appendChild(location);

  card.appendChild(renderBracketSide(homeSlot, model, matchLookup));
  card.appendChild(renderBracketSide(awaySlot || "3?", model, matchLookup));
  return card;
}

function renderBracketSide(slot, model, matchLookup) {
  if (/^[WL]\d+$/.test(slot)) {
    return renderFutureSide(slot, model, matchLookup);
  }

  return renderBracketTeam(slot, resolveSlot(slot, model));
}

function renderFutureSide(slot, model, matchLookup) {
  const row = el("div", "match-team future");
  row.appendChild(el("span", "slot-label", slot));
  const body = el("div", "future-slot");
  const sourceMatch = matchLookup.get(`M${slot.slice(1)}`);
  body.appendChild(el("strong", "", `${slot[0] === "L" ? "Loser" : "Winner"} of ${sourceMatch?.match || slot.slice(1)}`));
  body.appendChild(renderCandidateList(collectSlotCandidates(slot, model, matchLookup)));
  row.appendChild(body);
  return row;
}

function collectSlotCandidates(slot, model, matchLookup, seen = new Set()) {
  if (!slot) return [];
  if (/^[WL]\d+$/.test(slot)) {
    const matchId = `M${slot.slice(1)}`;
    if (seen.has(matchId)) return [];
    seen.add(matchId);
    const sourceMatch = matchLookup.get(matchId);
    return sourceMatch ? collectMatchCandidates(sourceMatch, model, matchLookup, seen) : [];
  }

  const team = resolveSlot(slot, model);
  return team ? [team] : [];
}

function collectMatchCandidates(match, model, matchLookup, seen) {
  return uniqueTeams([
    ...collectSlotCandidates(match.home, model, matchLookup, new Set(seen)),
    ...collectSlotCandidates(resolvedAwaySlot(match, model), model, matchLookup, new Set(seen)),
  ]);
}

function uniqueTeams(teams) {
  const seen = new Set();
  return teams.filter((team) => {
    const key = team?.id || team?.name;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function renderCandidateList(teams) {
  if (!teams.length) return el("div", "candidate-list pending", "Pending projected teams");

  const list = el("div", "candidate-list");
  for (const team of teams) {
    const chip = el("span", "candidate-chip", teamShortName(team));
    chip.title = team.name;
    chip.ariaLabel = team.name;
    list.appendChild(chip);
  }
  return list;
}

function renderBracketTeam(slot, team) {
  const row = el("div", "match-team");
  row.appendChild(el("span", "slot-label", slot));
  if (team?.logo) row.appendChild(teamLogo(team));
  row.appendChild(el("span", "team-name", team?.name || "TBD"));
  return row;
}

function renderThirdPlace(model) {
  els.thirdPlaceList.innerHTML = "";
  model.thirdRankings.forEach((team, index) => {
    const row = el("li", index >= 8 ? "out" : "");
    row.appendChild(el("span", "rank-pill", String(index + 1)));
    row.appendChild(renderTeamCell(team));
    row.appendChild(el("span", "stats", index < 8 ? "Qualifies" : `${team.points} pts`));
    els.thirdPlaceList.appendChild(row);
  });
}

function renderWarnings(model) {
  els.warningsList.innerHTML = "";
  const warnings = [...model.warnings];
  if (!model.annexeRow && model.thirdQualifierGroups.length === 8) {
    warnings.push(`No Annexe C row found for ${model.thirdQualifierGroups}. Check extracted data.`);
  }
  const criticalWarnings = warnings.filter(isCriticalWarning);
  if (els.warningsHeading) els.warningsHeading.hidden = !criticalWarnings.length;
  els.warningsList.hidden = !criticalWarnings.length;
  if (!criticalWarnings.length) {
    return;
  }
  for (const warning of criticalWarnings.slice(0, 6)) {
    els.warningsList.appendChild(el("div", "warning", warning));
  }
}

function isCriticalWarning(warning) {
  return (
    /tied on points, goal difference, and goals scored near the qualification line/i.test(warning) ||
    /tied on the eighth third-place cutoff/i.test(warning) ||
    /No Annexe C row found/i.test(warning) ||
    /^Odds missing for /i.test(warning)
  );
}

function renderHeader(model) {
  els.apiState.textContent = state.sourceLabel || "Not loaded";
  els.updatedAt.textContent = state.sourceUpdatedAtUtc
    ? formatTime(state.sourceUpdatedAtUtc)
    : "-";

  els.qualifiedCount.textContent = `${model.qualifiedTeams.length} / 32`;
  els.annexeOption.textContent = model.annexeRow ? `#${model.annexeRow.option}` : "-";
  els.annexeBadge.textContent = model.annexeRow
    ? `Annexe C option ${model.annexeRow.option}`
    : "Annexe C pending";
}

function selectedModeLabel() {
  return state.predictionsEnabled
    ? "Predicted view, using sidebar picks as results."
    : "Current view, using official and live results only.";
}

function renderModeLabels() {
  const label = selectedModeLabel();
  els.groupsModeLabel.textContent = label;
  els.thirdModeLabel.textContent = label;
  els.bracketModeLabel.textContent = state.predictionsEnabled
    ? "Projected path, using sidebar picks as results."
    : "Current path, using official and live results only.";
}

function renderTabs() {
  const tabs = [
    { key: "groups", button: els.groupsTabBtn, panel: els.groupsTab },
    { key: "third", button: els.thirdTabBtn, panel: els.thirdTab },
    { key: "bracket", button: els.bracketTabBtn, panel: els.bracketTab },
  ];

  for (const tab of tabs) {
    const active = tab.key === state.activeTab;
    tab.button.classList.toggle("active", active);
    tab.button.setAttribute("aria-selected", String(active));
    tab.panel.hidden = !active;
  }
}

function emptyState(message) {
  const template = document.getElementById("emptyStateTemplate");
  const node = template.content.firstElementChild.cloneNode(true);
  if (message) {
    node.querySelector("h2").textContent = message;
    node.querySelector("p").textContent = "";
  }
  return node;
}

function renderAll() {
  const activeModel = computeTournament(
    state.predictionsEnabled ? {} : { includePredictions: false }
  );
  renderHeader(activeModel);
  renderModeLabels();
  renderTabs();
  renderGroups(activeModel);
  renderFixtures();
  renderBracket(activeModel);
  renderThirdPlace(activeModel);
  renderWarnings(activeModel);
}

async function fetchJson(url) {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${url}`);
  }
  return data;
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${url}`);
  }
  return data;
}

async function ensureAnnexe() {
  if (!state.annexe.length) {
    state.annexe = await fetchJson("data/annexe-c.json");
  }
}

async function loadLocalData() {
  setBusy(true);
  try {
    await ensureAnnexe();
    const seed = await fetchJson(LOCAL_SEED_URL);
    normalizeLocalSeed(seed);
    const source = seed.source?.name ? ` from ${seed.source.name}` : "";
    els.oddsStatus.textContent = `Static tournament file loaded${source}. Refresh reloads the published snapshot.`;
    renderAll();
  } catch (error) {
    els.apiState.textContent = "Error";
    els.oddsStatus.textContent = error.message;
    renderAll();
  } finally {
    setBusy(false);
  }
}

async function refreshSourceFromGitHub() {
  await loadLocalData();
  return {
    fixtures: state.fixtures,
  };
}

async function refreshData() {
  setBusy(true);
  try {
    await refreshSourceFromGitHub();
  } catch (error) {
    els.apiState.textContent = "Error";
    els.oddsStatus.textContent = error.message;
    renderAll();
  } finally {
    setBusy(false);
  }
}

async function bootFromSources() {
  await loadLocalData();
}

function setBusy(busy) {
  [
    els.refreshBtn,
    els.clearPredictionsBtn,
    els.groupFilter,
    els.fixtureGroupFilter,
    els.ticketMatchFilter,
    els.predictionModeToggle,
  ].forEach((node) => {
    if (node) node.disabled = busy;
  });
}

function fixturePayload(fixture) {
  return {
    id: fixture.id,
    date: fixture.date,
    group: fixture.group,
    statusShort: fixture.statusShort,
    home: { name: fixture.home.name },
    away: { name: fixture.away.name },
    goals: fixture.goals,
  };
}

function eligibleOddsFixtures(mode) {
  return state.fixtures.filter((fixture) => {
    if (isLockedFixture(fixture)) return false;
    if (mode === "syncOdds") {
      return state.predictions[fixture.id]?.source !== "manual";
    }
    const score = getFixtureScore(fixture);
    if (mode === "reseedOdds") {
      return state.predictions[fixture.id]?.source === "odds";
    }
    return score.source === "empty";
  });
}

function evidenceWarningsFromResponse(payload) {
  const warnings = [];
  for (const fixtureId of payload.oddsUnavailable || []) {
    const fixture = state.fixtures.find((candidate) => String(candidate.id) === String(fixtureId));
    if (fixture) warnings.push(`Odds missing for ${fixture.home.name} vs ${fixture.away.name}.`);
  }
  for (const [provider, status] of Object.entries(payload.providerStatus || {})) {
    if (status && status.ok === false && status.error) {
      warnings.push(`${provider}: ${status.error}`);
    }
  }
  return warnings;
}

function applyOddsImport(payload, mode, options = {}) {
  let applied = 0;
  let skipped = 0;
  for (const [fixtureId, prediction] of Object.entries(payload.predictions || {})) {
    const fixture = state.fixtures.find((candidate) => String(candidate.id) === String(fixtureId));
    if (!fixture || isLockedFixture(fixture)) {
      skipped += 1;
      continue;
    }
    const existing = state.predictions[fixtureId];
    if (existing?.source === "manual" && hasUsablePrediction(existing)) {
      skipped += 1;
      continue;
    }
    if (mode === "reseedOdds" && existing?.source !== "odds") {
      skipped += 1;
      continue;
    }
    if (mode !== "reseedOdds" && mode !== "syncOdds" && getFixtureScore(fixture).source !== "empty") {
      skipped += 1;
      continue;
    }
    const home = safeNumber(prediction.home);
    const away = safeNumber(prediction.away);
    if (home === null || away === null) {
      skipped += 1;
      continue;
    }
    state.predictions[fixtureId] = { home, away, source: "odds" };
    if (payload.marketEvidence?.[fixtureId]) {
      state.marketEvidence[fixtureId] = payload.marketEvidence[fixtureId];
    }
    applied += 1;
  }
  if (options.persist !== false) {
    savePredictions();
    saveMarketEvidence();
  }
  return { applied, skipped };
}

async function seedFromOdds(mode = "seedEmpty", options = {}) {
  els.oddsStatus.textContent = "Odds refresh is unavailable on the static GitHub Pages build.";
  renderAll();
}

function clearPredictions() {
  state.predictions = {};
  state.marketEvidence = {};
  savePredictions();
  saveMarketEvidence();
  els.oddsStatus.textContent = "Predictions cleared.";
  renderAll();
}

function setActiveTab(tab) {
  state.activeTab = tab;
  renderAll();
}

function togglePredictionHelp(forceOpen) {
  const open = forceOpen ?? els.predictionHelp.hidden;
  els.predictionHelp.hidden = !open;
  els.predictionHelpBtn.setAttribute("aria-expanded", String(open));
}

function bindEvents() {
  els.refreshBtn.addEventListener("click", bootFromSources);
  els.clearPredictionsBtn.addEventListener("click", clearPredictions);
  els.groupsTabBtn.addEventListener("click", () => setActiveTab("groups"));
  els.thirdTabBtn.addEventListener("click", () => setActiveTab("third"));
  els.bracketTabBtn.addEventListener("click", () => setActiveTab("bracket"));
  els.predictionModeToggle.addEventListener("change", () => {
    state.predictionsEnabled = els.predictionModeToggle.checked;
    renderAll();
  });
  els.predictionHelpBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    togglePredictionHelp();
  });
  document.addEventListener("click", (event) => {
    if (
      els.predictionHelp.hidden ||
      els.predictionHelp.contains(event.target) ||
      els.predictionHelpBtn.contains(event.target)
    ) {
      return;
    }
    togglePredictionHelp(false);
  });
  els.groupFilter.addEventListener("change", () => {
    state.selectedGroup = els.groupFilter.value;
    renderAll();
  });
  els.fixtureGroupFilter.addEventListener("change", () => {
    state.selectedFixtureGroup = els.fixtureGroupFilter.value;
    renderFixtures();
  });
  els.ticketMatchFilter.addEventListener("change", () => {
    state.selectedTicketMatch = els.ticketMatchFilter.value;
    renderAll();
  });
}

bindEvents();
bootFromSources();
