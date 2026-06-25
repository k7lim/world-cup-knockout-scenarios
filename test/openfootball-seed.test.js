const assert = require("node:assert/strict");
const test = require("node:test");

const {
  COMMITS_API_URL,
  TOURNAMENT_START_UTC,
  buildSeed,
  rawSourceUrl,
} = require("../scripts/build-openfootball-seed");

function jsonResponse(body) {
  return {
    ok: true,
    status: 200,
    async json() {
      return body;
    },
  };
}

test("buildSeed pins source data to the latest commit touching the upstream file", async () => {
  const calls = [];
  const sourceCommit = "abc123abc123abc123abc123abc123abc123abc1";
  const fetchImpl = async (url) => {
    calls.push(url);
    if (url === COMMITS_API_URL) {
      return jsonResponse([
        {
          sha: sourceCommit,
          html_url: `https://github.com/openfootball/worldcup.json/commit/${sourceCommit}`,
          commit: {
            committer: { date: "2026-06-24T15:37:07Z" },
          },
        },
      ]);
    }
    if (url === rawSourceUrl(sourceCommit)) {
      return jsonResponse({
        matches: [
          {
            round: "Matchday 1",
            group: "Group A",
            date: "2026-06-11",
            time: "19:00 UTC-5",
            ground: "Mexico City (Estadio Azteca)",
            team1: "Mexico",
            team2: "South Africa",
          },
        ],
      });
    }
    throw new Error(`unexpected fetch URL: ${url}`);
  };

  const seed = await buildSeed({ fetchImpl, env: {} });

  assert.deepEqual(calls, [COMMITS_API_URL, rawSourceUrl(sourceCommit)]);
  assert.equal(seed.source.commitSha, sourceCommit);
  assert.equal(seed.source.commitDateUtc, "2026-06-24T15:37:07Z");
  assert.equal(seed.source.rawUrl, rawSourceUrl(sourceCommit));
  assert.equal(seed.fixtures.length, 1);
  assert.equal(seed.fixtures[0].date, "2026-06-12T00:00:00.000Z");
});

test("openfootball commit checks are scoped to tournament updates", () => {
  assert.match(COMMITS_API_URL, /path=2026\/worldcup\.json/);
  assert.match(COMMITS_API_URL, new RegExp(`since=${encodeURIComponent(TOURNAMENT_START_UTC)}`));
});
