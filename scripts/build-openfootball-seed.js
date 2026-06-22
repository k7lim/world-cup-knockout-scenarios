const fs = require("fs/promises");
const path = require("path");

const SOURCE_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";
const OUT_PATH = path.join(__dirname, "..", "data", "world-cup-2026-seed.json");

function groupLetter(groupName) {
  const match = String(groupName || "").match(/Group\s+([A-L])/i);
  return match ? match[1].toUpperCase() : null;
}

function toIsoDateTime(date, time) {
  const match = String(time || "").match(/^(\d{1,2}):(\d{2})(?:\s+UTC([+-]\d{1,2}))?$/);
  if (!match) return `${date}T00:00:00.000Z`;

  const [, rawHour, minute, rawOffset] = match;
  const hour = rawHour.padStart(2, "0");
  if (!rawOffset) return `${date}T${hour}:${minute}:00.000Z`;

  const offsetHour = Math.abs(Number(rawOffset)).toString().padStart(2, "0");
  const sign = rawOffset.startsWith("-") ? "-" : "+";
  return new Date(`${date}T${hour}:${minute}:00${sign}${offsetHour}:00`).toISOString();
}

function parseVenue(ground) {
  const text = String(ground || "").trim();
  const cityMatch = text.match(/^(.*?)\s+\((.*?)\)$/);
  return {
    name: text || "TBD",
    city: cityMatch ? cityMatch[1] : text || "TBD",
  };
}

function makeTeamId(index) {
  return 260000 + index;
}

async function buildSeed() {
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`Failed to download openfootball seed: ${response.status}`);
  }

  const source = await response.json();
  const teamIds = new Map();
  const groupTeams = new Map();
  const fixtures = [];

  for (const [index, match] of (source.matches || []).entries()) {
    const group = groupLetter(match.group);
    if (!group) continue;

    for (const name of [match.team1, match.team2]) {
      if (!teamIds.has(name)) teamIds.set(name, makeTeamId(teamIds.size + 1));
      if (!groupTeams.has(group)) groupTeams.set(group, []);
      const teams = groupTeams.get(group);
      if (!teams.includes(name)) teams.push(name);
    }

    const score = match.score?.ft;
    fixtures.push({
      id: 2026000 + index + 1,
      group,
      round: match.round || "Group Stage",
      date: toIsoDateTime(match.date, match.time),
      venue: parseVenue(match.ground),
      statusShort: Array.isArray(score) ? "FT" : "NS",
      statusLong: Array.isArray(score) ? "Match Finished" : "Not Started",
      home: {
        id: teamIds.get(match.team1),
        name: match.team1,
        logo: "",
      },
      away: {
        id: teamIds.get(match.team2),
        name: match.team2,
        logo: "",
      },
      goals: {
        home: Array.isArray(score) ? score[0] : null,
        away: Array.isArray(score) ? score[1] : null,
      },
    });
  }

  const groups = "ABCDEFGHIJKL".split("").map((letter) => ({
    letter,
    name: `Group ${letter}`,
    teams: (groupTeams.get(letter) || []).map((name, index) => ({
      id: teamIds.get(name),
      name,
      logo: "",
      seedRank: index + 1,
    })),
  }));

  const seed = {
    schemaVersion: 1,
    name: "World Cup 2026 Local Tournament File",
    updatedAtUtc: new Date().toISOString(),
    source: {
      name: "openfootball/worldcup.json",
      url: SOURCE_URL,
      license: "CC0-1.0",
      note:
        "Public-domain hand-maintained fixture/results snapshot. Not live; update this file or import scores as needed.",
    },
    groups,
    fixtures,
  };

  return seed;
}

async function writeSeed(seed, outPath = OUT_PATH) {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, `${JSON.stringify(seed, null, 2)}\n`);
}

async function main() {
  const seed = await buildSeed();
  await writeSeed(seed);
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`${seed.groups.length} groups, ${seed.fixtures.length} group-stage fixtures`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  SOURCE_URL,
  OUT_PATH,
  buildSeed,
  writeSeed,
};
