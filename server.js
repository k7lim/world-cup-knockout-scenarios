const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const { URL } = require("url");
const { buildSeed, writeSeed } = require("./scripts/build-openfootball-seed");

const PORT = Number(process.env.PORT || 5173);
const THE_ODDS_API_BASE = "https://api.the-odds-api.com/v4";
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const ODDS_CACHE_PATH = path.join(ROOT, "data", "odds-refresh-cache.json");

loadEnv(path.join(ROOT, ".env"));

const THE_ODDS_API_KEY = process.env.THE_ODDS_API_KEY;
const ODDS_API_IO_KEY = process.env.ODDS_API_IO_KEY;
const ODDS_API_IO_BASE = process.env.ODDS_API_IO_BASE || "https://api.odds-api.io/v3";
const ODDS_STALE_MULTIPLIER = Math.max(1, Number(process.env.ODDS_STALE_MULTIPLIER || 1.5));
const AUTO_ODDS_MIN_REFRESH_MS = Math.max(
  5 * 60 * 1000,
  Number(process.env.AUTO_ODDS_MIN_REFRESH_MS || 6 * 60 * 60 * 1000)
);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const publicDataFiles = new Set(["data/annexe-c.json", "data/world-cup-2026-seed.json"]);

function loadEnv(filePath) {
  try {
    const body = require("fs").readFileSync(filePath, "utf8");
    for (const line of body.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function json(res, status, body, headers = {}) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...headers,
  });
  res.end(JSON.stringify(body));
}

function quotaHeaders(headers) {
  const quota = {};
  for (const [key, value] of headers.entries()) {
    const lower = key.toLowerCase();
    if (lower.includes("limit") || lower.includes("remaining") || lower.includes("request")) {
      quota[lower] = value;
    }
  }
  return quota;
}

async function readJsonBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1_000_000) {
      const error = new Error("Request body is too large.");
      error.status = 413;
      throw error;
    }
  }
  return body ? JSON.parse(body) : {};
}

async function readOddsCache() {
  try {
    const body = await fs.readFile(ODDS_CACHE_PATH, "utf8");
    const parsed = JSON.parse(body);
    return {
      schemaVersion: 1,
      fixtureProviders: parsed.fixtureProviders || {},
      providerResponses: parsed.providerResponses || {},
    };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return { schemaVersion: 1, fixtureProviders: {}, providerResponses: {} };
  }
}

async function writeOddsCache(cache) {
  await fs.mkdir(path.dirname(ODDS_CACHE_PATH), { recursive: true });
  await fs.writeFile(ODDS_CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`);
}

function normalizeName(name) {
  const aliases = new Map([
    ["turkiye", "turkey"],
    ["turkiye republic", "turkey"],
    ["czechia", "czech republic"],
    ["usa", "united states"],
    ["us", "united states"],
    ["united states of america", "united states"],
    ["congo dr", "dr congo"],
    ["congo democratic republic", "dr congo"],
    ["democratic republic of congo", "dr congo"],
    ["curacao", "curacao"],
    ["cote d ivoire", "ivory coast"],
  ]);
  const normalized = String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return aliases.get(normalized) || normalized;
}

function kickoffMs(fixture) {
  const value = Date.parse(fixture?.date || fixture?.kickoffUtc || "");
  return Number.isFinite(value) ? value : null;
}

function refreshIntervalMs(fixture, nowMs = Date.now()) {
  const kickoff = kickoffMs(fixture);
  if (!kickoff || kickoff <= nowMs) return null;
  const hours = (kickoff - nowMs) / 36e5;
  if (hours <= 1.5) return 5 * 60 * 1000;
  if (hours <= 6) return 15 * 60 * 1000;
  if (hours <= 24) return 60 * 60 * 1000;
  if (hours <= 7 * 24) return 6 * 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
}

function effectiveRefreshIntervalMs(fixture, mode, nowMs = Date.now()) {
  const interval = refreshIntervalMs(fixture, nowMs);
  if (!interval) return null;
  return mode === "syncOdds" ? Math.max(interval, AUTO_ODDS_MIN_REFRESH_MS) : interval;
}

function isFixtureRefreshable(fixture) {
  const terminal = new Set(["FT", "AET", "PEN", "AWD", "WO"]);
  if (terminal.has(fixture?.statusShort)) return false;
  const kickoff = kickoffMs(fixture);
  return Boolean(kickoff && kickoff > Date.now());
}

function eventId(event) {
  return String(event?.id || event?.eventId || event?.event_id || event?.fixtureId || "");
}

function eventStartMs(event) {
  const value =
    event?.commence_time ||
    event?.commenceTime ||
    event?.startTime ||
    event?.start_time ||
    event?.kickoff ||
    event?.date;
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : null;
}

function participantName(participant) {
  return participant?.name || participant?.team || participant?.participantName || participant?.title || "";
}

function eventHomeName(event) {
  if (event?.home_team) return event.home_team;
  if (event?.homeTeam) return participantName(event.homeTeam);
  if (event?.home) return participantName(event.home);
  if (event?.teams?.home) return participantName(event.teams.home);
  const home = (event?.participants || []).find((item) =>
    /home/i.test(String(item?.type || item?.side || item?.role || ""))
  );
  return participantName(home);
}

function eventAwayName(event) {
  if (event?.away_team) return event.away_team;
  if (event?.awayTeam) return participantName(event.awayTeam);
  if (event?.away) return participantName(event.away);
  if (event?.teams?.away) return participantName(event.teams.away);
  const away = (event?.participants || []).find((item) =>
    /away/i.test(String(item?.type || item?.side || item?.role || ""))
  );
  return participantName(away);
}

function arrayFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.response)) return payload.response;
  if (Array.isArray(payload?.events)) return payload.events;
  if (Array.isArray(payload?.odds)) return payload.odds;
  return [];
}

function findProviderEvent(fixture, events) {
  const fixtureKickoff = kickoffMs(fixture);
  const home = normalizeName(fixture.home?.name);
  const away = normalizeName(fixture.away?.name);
  let best = null;

  for (const event of events || []) {
    const id = eventId(event);
    const start = eventStartMs(event);
    if (!id || !start || !fixtureKickoff) continue;
    const timeDelta = Math.abs(start - fixtureKickoff);
    if (timeDelta > 3 * 60 * 60 * 1000) continue;
    const homeMatches = normalizeName(eventHomeName(event)) === home;
    const awayMatches = normalizeName(eventAwayName(event)) === away;
    if (!homeMatches || !awayMatches) continue;
    if (!best || timeDelta < best.timeDelta) best = { event, timeDelta };
  }

  return best?.event || null;
}

async function providerGet(baseUrl, endpoint, params, apiKey) {
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`);
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  if (apiKey) url.searchParams.set("apiKey", apiKey);

  const response = await fetch(url, {
    headers: { "user-agent": "world-cup-explorer/0.1" },
  });
  const quota = quotaHeaders(response.headers);
  let data;
  try {
    data = await response.json();
  } catch (error) {
    error.status = response.status || 502;
    error.quota = quota;
    throw error;
  }
  if (!response.ok) {
    const error = new Error(`${url.pathname} failed with ${response.status}.`);
    error.status = response.status || 502;
    error.details = data;
    error.quota = quota;
    throw error;
  }
  return { data, quota };
}

async function fetchTheOddsApi(cache, fixturesToRefresh) {
  if (!THE_ODDS_API_KEY || !fixturesToRefresh.length) {
    return { ok: Boolean(THE_ODDS_API_KEY), events: [], odds: [], error: THE_ODDS_API_KEY ? null : "THE_ODDS_API_KEY is not set." };
  }

  const fetchedAtUtc = new Date().toISOString();
  const eventsResult = await providerGet(
    THE_ODDS_API_BASE,
    "/sports/soccer_fifa_world_cup/events",
    {},
    THE_ODDS_API_KEY
  );
  const oddsResult = await providerGet(
    THE_ODDS_API_BASE,
    "/sports/soccer_fifa_world_cup/odds",
    {
      regions: process.env.THE_ODDS_API_REGIONS || "us,uk,eu",
      markets: "h2h,spreads,totals",
      oddsFormat: "decimal",
    },
    THE_ODDS_API_KEY
  );

  const events = arrayFromPayload(eventsResult.data);
  const odds = arrayFromPayload(oddsResult.data);
  cache.providerResponses.theOddsApi = {
    events: {
      endpoint: "/v4/sports/soccer_fifa_world_cup/events",
      fetchedAtUtc,
      quotaHeaders: eventsResult.quota,
      marketsReturned: [],
      raw: eventsResult.data,
    },
    odds: {
      endpoint: "/v4/sports/soccer_fifa_world_cup/odds",
      fetchedAtUtc,
      quotaHeaders: oddsResult.quota,
      marketsReturned: marketsReturned(oddsResult.data),
      raw: oddsResult.data,
    },
  };

  return { ok: true, events, odds };
}

async function fetchOddsApiIo(cache, eventIds) {
  if (!ODDS_API_IO_KEY) {
    return { ok: false, events: [], odds: [], error: "ODDS_API_IO_KEY is not set." };
  }
  if (!eventIds.length) {
    return { ok: false, events: [], odds: [], error: "No Odds-API.io events matched eligible fixtures." };
  }

  const fetchedAtUtc = new Date().toISOString();
  const oddsResult = await providerGet(
    ODDS_API_IO_BASE,
    "/odds/multi",
    { eventIds: eventIds.join(","), bookmakers: process.env.ODDS_API_IO_BOOKMAKERS || "" },
    ODDS_API_IO_KEY
  );

  const odds = arrayFromPayload(oddsResult.data);
  cache.providerResponses.oddsApiIo = cache.providerResponses.oddsApiIo || {};
  cache.providerResponses.oddsApiIo = {
    ...cache.providerResponses.oddsApiIo,
    odds: {
      endpoint: "/v3/odds/multi",
      fetchedAtUtc,
      quotaHeaders: oddsResult.quota,
      marketsReturned: marketsReturned(oddsResult.data),
      raw: oddsResult.data,
    },
  };

  return { ok: true, events: [], odds };
}

function marketsReturned(payload) {
  const names = new Set();
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (node.key || node.name || node.market || node.marketName) {
      const value = node.key || node.name || node.market || node.marketName;
      if (typeof value === "string" && (node.outcomes || node.values || node.selections)) names.add(value);
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object") visit(value);
    }
  };
  visit(payload);
  return Array.from(names).sort();
}

function oddsForEvent(oddsList, id) {
  return (oddsList || []).filter((item) => {
    const itemId = eventId(item) || String(item?.event_id || item?.eventId || "");
    return itemId === String(id);
  });
}

function bookmakerEntries(payload) {
  const entries = [];
  const add = (bookmaker, markets) => {
    if (markets?.length) {
      entries.push({
        key: bookmaker?.key || bookmaker?.id || bookmaker?.bookmaker || bookmaker?.name || `book-${entries.length + 1}`,
        title: bookmaker?.title || bookmaker?.name || bookmaker?.bookmaker || bookmaker?.key || `Book ${entries.length + 1}`,
        markets,
      });
    }
  };

  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node.bookmakers)) {
      for (const bookmaker of node.bookmakers) add(bookmaker, bookmaker.markets || bookmaker.bets || bookmaker.odds || []);
    }
    if (Array.isArray(node.sites)) {
      for (const site of node.sites) add(site, site.odds || site.markets || []);
    }
    if (Array.isArray(node.markets) || Array.isArray(node.bets)) {
      add({ name: node.bookmaker || node.bookmakerName }, node.markets || node.bets);
    }
  };

  for (const item of Array.isArray(payload) ? payload : [payload]) visit(item);
  return entries;
}

function marketName(market) {
  return String(market?.key || market?.name || market?.market || market?.marketName || market?.type || "").toLowerCase();
}

function marketOutcomes(market) {
  return market?.outcomes || market?.values || market?.selections || market?.odds || [];
}

function outcomeName(outcome) {
  return String(outcome?.name || outcome?.value || outcome?.label || outcome?.selection || outcome?.betSide || outcome?.side || "");
}

function decimalOdd(outcome) {
  const value = Number(outcome?.price ?? outcome?.odd ?? outcome?.odds ?? outcome?.decimal ?? outcome?.valueOdds);
  return Number.isFinite(value) && value > 1 ? value : null;
}

function scoreFromOutcomeName(name) {
  const match = String(name || "").match(/(\d+)\s*[-:]\s*(\d+)/);
  return match ? `${Number(match[1])}-${Number(match[2])}` : null;
}

function parseCorrectScore(oddsPayload) {
  const bookScores = [];
  for (const book of bookmakerEntries(oddsPayload)) {
    const scoreImplied = new Map();
    for (const market of book.markets || []) {
      const name = marketName(market);
      if (!/(correct[\s_-]*score|scoreline|exact[\s_-]*score)/i.test(name)) continue;
      for (const outcome of marketOutcomes(market)) {
        const score = scoreFromOutcomeName(outcomeName(outcome));
        const odd = decimalOdd(outcome);
        if (!score || !odd) continue;
        scoreImplied.set(score, (scoreImplied.get(score) || 0) + 1 / odd);
      }
    }
    const total = Array.from(scoreImplied.values()).reduce((sum, value) => sum + value, 0);
    if (!total) continue;
    const normalized = new Map();
    for (const [score, value] of scoreImplied) normalized.set(score, value / total);
    bookScores.push(normalized);
  }

  if (!bookScores.length) return null;
  const averaged = new Map();
  for (const book of bookScores) {
    for (const [score, probability] of book) {
      averaged.set(score, (averaged.get(score) || 0) + probability / bookScores.length);
    }
  }
  const top = Array.from(averaged.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const [home, away] = top[0][0].split("-").map(Number);
  return {
    score: { home, away },
    evidence: {
      marketUsed: "correct_score",
      confidence: bookScores.length >= 2 ? "medium" : "low",
      probability: Number(top[0][1].toFixed(3)),
      bookmakerCount: bookScores.length,
      topCorrectScores: Object.fromEntries(top.map(([score, probability]) => [score, Number(probability.toFixed(3))])),
    },
  };
}

function outcomeSide(outcome, fixture) {
  const name = normalizeName(outcomeName(outcome));
  if (name === "draw" || name === "x") return "draw";
  if (name === "home" || name === "1" || name === normalizeName(fixture.home?.name)) return "home";
  if (name === "away" || name === "2" || name === normalizeName(fixture.away?.name)) return "away";
  return null;
}

function parseOneXTwoAndShape(fixture, oddsPayloads) {
  const bookProbabilities = [];
  const totals = [];
  const spreads = [];

  for (const payload of oddsPayloads) {
    for (const book of bookmakerEntries(payload)) {
      let oneXTwo = null;
      for (const market of book.markets || []) {
        const name = marketName(market);
        if (name === "h2h" || name === "ml" || name.includes("moneyline") || name.includes("match winner") || name === "1x2") {
          const implied = { home: 0, draw: 0, away: 0 };
          for (const outcome of marketOutcomes(market)) {
            const side = outcomeSide(outcome, fixture);
            const odd = decimalOdd(outcome);
            if (side && odd) implied[side] += 1 / odd;
          }
          const total = implied.home + implied.draw + implied.away;
          if (total) oneXTwo = { home: implied.home / total, draw: implied.draw / total, away: implied.away / total };
        }
        if (name.includes("total") || name.includes("over/under") || name.includes("goals over")) {
          for (const outcome of marketOutcomes(market)) {
            const point = Number(outcome?.point ?? outcome?.line ?? outcome?.handicap);
            if (Number.isFinite(point)) totals.push(point);
          }
        }
        if (name.includes("spread") || name.includes("handicap")) {
          for (const outcome of marketOutcomes(market)) {
            const side = outcomeSide(outcome, fixture);
            const point = Number(outcome?.point ?? outcome?.line ?? outcome?.handicap);
            if (side && Number.isFinite(point)) spreads.push({ side, point });
          }
        }
      }
      if (oneXTwo) bookProbabilities.push(oneXTwo);
    }
  }

  if (!bookProbabilities.length) return null;
  const average = bookProbabilities.reduce(
    (sum, row) => ({
      home: sum.home + row.home / bookProbabilities.length,
      draw: sum.draw + row.draw / bookProbabilities.length,
      away: sum.away + row.away / bookProbabilities.length,
    }),
    { home: 0, draw: 0, away: 0 }
  );
  const totalLine = totals.length ? totals.reduce((sum, value) => sum + value, 0) / totals.length : null;
  const homeSpread = spreads.find((spread) => spread.side === "home")?.point ?? null;
  const awaySpread = spreads.find((spread) => spread.side === "away")?.point ?? null;
  const hasShape = totalLine !== null || homeSpread !== null || awaySpread !== null;
  return { average, bookmakerCount: bookProbabilities.length, totalLine, homeSpread, awaySpread, hasShape };
}

function scoreFromMarketShape(parsed) {
  const { average, totalLine, homeSpread, awaySpread, hasShape } = parsed;
  const winner = Object.entries(average).sort((a, b) => b[1] - a[1])[0];
  if (winner[0] === "draw") return totalLine !== null && totalLine <= 2 ? { home: 0, away: 0 } : { home: 1, away: 1 };

  const favoriteSide = winner[0];
  const favoriteProbability = winner[1];
  const spreadSupportsTwo =
    (favoriteSide === "home" && homeSpread !== null && homeSpread <= -1.25) ||
    (favoriteSide === "away" && awaySpread !== null && awaySpread <= -1.25);
  const strongFavorite = favoriteProbability >= 0.62 || spreadSupportsTwo;
  const totalHigh = totalLine !== null && totalLine >= 2.75;
  const favoriteGoals = strongFavorite ? 2 : totalHigh && hasShape ? 2 : 1;
  const underdogGoals = strongFavorite ? 0 : totalHigh && hasShape ? 1 : 0;
  return favoriteSide === "home"
    ? { home: favoriteGoals, away: underdogGoals }
    : { home: underdogGoals, away: favoriteGoals };
}

function predictionFromMarkets(fixture, providerOdds) {
  const correctScore = parseCorrectScore(providerOdds.oddsApiIo || []);
  if (correctScore) return correctScore;

  const parsed = parseOneXTwoAndShape(fixture, [providerOdds.theOddsApi || [], providerOdds.oddsApiIo || []]);
  if (!parsed) return null;
  const score = scoreFromMarketShape(parsed);
  const winner = Object.entries(parsed.average).sort((a, b) => b[1] - a[1])[0];
  return {
    score,
    evidence: {
      marketUsed: parsed.hasShape ? "1x2_totals_spread" : "1x2",
      confidence: parsed.bookmakerCount >= 2 ? "medium" : "low",
      probability: Number(winner[1].toFixed(3)),
      bookmakerCount: parsed.bookmakerCount,
      fallbackUsed: !correctScore,
      topCorrectScores: null,
    },
  };
}

async function handleOddsPredictions(req, res) {
  const body = await readJsonBody(req);
  const fixtures = Array.isArray(body.fixtures) ? body.fixtures : [];
  const mode = ["reseedOdds", "syncOdds"].includes(body.mode) ? body.mode : "seedEmpty";
  const cache = await readOddsCache();
  const nowMs = Date.now();
  const eligibleFixtures = fixtures.filter(isFixtureRefreshable);
  const fixturesToRefresh = eligibleFixtures.filter((fixture) => {
    const evidence = cache.fixtureProviders[String(fixture.id)]?.evidence;
    const updatedAt = Date.parse(evidence?.updatedAtUtc || "");
    const interval = effectiveRefreshIntervalMs(fixture, mode, nowMs);
    if (!interval || !Number.isFinite(updatedAt)) return true;
    return nowMs - updatedAt > interval;
  });

  const providerStatus = {};
  let theOddsApi = { ok: false, events: [], odds: [] };
  let oddsApiIoEvents = [];

  try {
    theOddsApi = await fetchTheOddsApi(cache, fixturesToRefresh);
    providerStatus.theOddsApi = { ok: theOddsApi.ok, error: theOddsApi.error || null };
  } catch (error) {
    providerStatus.theOddsApi = { ok: false, error: error.message, quotaHeaders: error.quota || {} };
  }

  if (theOddsApi.ok) {
    for (const fixture of fixturesToRefresh) {
      const mapped = cache.fixtureProviders[String(fixture.id)] || { providers: {} };
      const event = mapped.providers?.theOddsApi?.eventId
        ? null
        : findProviderEvent(fixture, theOddsApi.events);
      if (event) {
        mapped.providers.theOddsApi = { eventId: eventId(event) };
        mapped.matchedAtUtc = mapped.matchedAtUtc || new Date().toISOString();
        cache.fixtureProviders[String(fixture.id)] = mapped;
      }
    }
  }

  if (ODDS_API_IO_KEY && fixturesToRefresh.length) {
    try {
      const eventsResult = await providerGet(
        ODDS_API_IO_BASE,
        "/events",
        { sport: "football", league: "international-fifa-world-cup" },
        ODDS_API_IO_KEY
      );
      oddsApiIoEvents = arrayFromPayload(eventsResult.data);
      cache.providerResponses.oddsApiIo = cache.providerResponses.oddsApiIo || {};
      cache.providerResponses.oddsApiIo.events = {
        endpoint: "/v3/events",
        fetchedAtUtc: new Date().toISOString(),
        quotaHeaders: eventsResult.quota,
        marketsReturned: [],
        raw: eventsResult.data,
      };
      for (const fixture of fixturesToRefresh) {
        const mapped = cache.fixtureProviders[String(fixture.id)] || { providers: {} };
        const event = mapped.providers?.oddsApiIo?.eventId
          ? null
          : findProviderEvent(fixture, oddsApiIoEvents);
        if (event) {
          mapped.providers.oddsApiIo = { eventId: eventId(event) };
          mapped.matchedAtUtc = mapped.matchedAtUtc || new Date().toISOString();
          cache.fixtureProviders[String(fixture.id)] = mapped;
        }
      }
      const ids = fixturesToRefresh
        .map((fixture) => cache.fixtureProviders[String(fixture.id)]?.providers?.oddsApiIo?.eventId)
        .filter(Boolean);
      const oddsApiIo = await fetchOddsApiIo(cache, Array.from(new Set(ids)));
      providerStatus.oddsApiIo = { ok: oddsApiIo.ok, error: oddsApiIo.error || null };
    } catch (error) {
      providerStatus.oddsApiIo = { ok: false, error: error.message, quotaHeaders: error.quota || {} };
    }
  } else if (!ODDS_API_IO_KEY) {
    providerStatus.oddsApiIo = { ok: false, error: "ODDS_API_IO_KEY is not set." };
  } else {
    providerStatus.oddsApiIo = { ok: true, error: null, skipped: "fresh cache" };
  }

  const theOddsOdds = arrayFromPayload(cache.providerResponses.theOddsApi?.odds?.raw);
  const oddsApiIoOdds = arrayFromPayload(cache.providerResponses.oddsApiIo?.odds?.raw);
  const predictions = {};
  const marketEvidence = {};
  const oddsUnavailable = [];

  for (const fixture of eligibleFixtures) {
    const mapped = cache.fixtureProviders[String(fixture.id)] || { providers: {} };
    const providerOdds = {
      theOddsApi: mapped.providers?.theOddsApi?.eventId
        ? oddsForEvent(theOddsOdds, mapped.providers.theOddsApi.eventId)
        : [],
      oddsApiIo: mapped.providers?.oddsApiIo?.eventId
        ? oddsForEvent(oddsApiIoOdds, mapped.providers.oddsApiIo.eventId)
        : [],
    };
    const prediction = predictionFromMarkets(fixture, providerOdds);
    const interval = effectiveRefreshIntervalMs(fixture, mode, nowMs);
    if (!prediction) {
      oddsUnavailable.push(String(fixture.id));
      continue;
    }
    predictions[String(fixture.id)] = { ...prediction.score, source: "odds" };
    marketEvidence[String(fixture.id)] = {
      ...prediction.evidence,
      updatedAtUtc: new Date().toISOString(),
      staleAfterMs: interval ? Math.round(interval * ODDS_STALE_MULTIPLIER) : null,
      stale: false,
      providers: mapped.providers || {},
    };
    mapped.evidence = marketEvidence[String(fixture.id)];
    cache.fixtureProviders[String(fixture.id)] = mapped;
  }

  await writeOddsCache(cache);
  json(res, 200, {
    schemaVersion: 1,
    type: "wc2026-predictions",
    mode,
    exportedAtUtc: new Date().toISOString(),
    source: {
      name: "sportsbook-sentiment aggregate",
      generatedBy: "world-cup-explorer odds refresh",
      marketsUsed: ["Correct Score", "1X2", "totals", "spread"],
      booksOrApis: ["The Odds API", "Odds-API.io"],
    },
    predictions,
    marketEvidence,
    oddsUnavailable,
    providerStatus,
  });
}

async function handleOpenfootballRefresh(res) {
  const seed = await buildSeed();
  await writeSeed(seed);
  json(res, 200, seed);
}

function safeStaticPath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const relative = normalized === "/" ? "index.html" : normalized.replace(/^[/\\]/, "");
  if (relative.startsWith("data/") && !publicDataFiles.has(relative)) return null;
  const candidate =
    relative.startsWith("data/")
      ? path.join(ROOT, relative)
      : path.join(PUBLIC_DIR, relative);
  const allowedRoot = relative.startsWith("data/") ? ROOT : PUBLIC_DIR;
  return candidate.startsWith(allowedRoot) ? candidate : null;
}

async function serveStatic(reqUrl, res) {
  const filePath = safeStaticPath(reqUrl.pathname);
  if (!filePath) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const body = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    const immutable = reqUrl.pathname.startsWith("/data/");
    res.writeHead(200, {
      "content-type": mimeTypes[ext] || "application/octet-stream",
      "cache-control": immutable ? "public, max-age=3600" : "no-cache",
    });
    res.end(body);
  } catch (error) {
    if (error.code === "ENOENT") {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(500);
    res.end("Server error");
  }
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (reqUrl.pathname === "/api/openfootball/refresh" && req.method === "POST") {
      await handleOpenfootballRefresh(res);
      return;
    }
    if (reqUrl.pathname === "/api/odds/predictions" && req.method === "POST") {
      await handleOddsPredictions(req, res);
      return;
    }

    await serveStatic(reqUrl, res);
  } catch (error) {
    json(res, error.status || 500, {
      error: error.message,
      details: error.details,
      rate: error.rate,
    });
  }
});

server.listen(PORT, () => {
  console.log(`World Cup explorer running at http://localhost:${PORT}`);
});
