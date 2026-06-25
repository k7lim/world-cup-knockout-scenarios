const test = require("node:test");
const assert = require("node:assert/strict");
const {
  KNOCKOUT_FIXTURES,
  combinedRefreshDecision,
  refreshWindowDecision,
  upstreamCommitDecision,
} = require("../scripts/should-refresh-static-site");

const groupFixtures = [
  { id: 2026063, date: "2026-06-23T17:00:00.000Z" },
  { id: 2026011, date: "2026-06-24T19:00:00.000Z" },
];

function at(isoDate) {
  return Date.parse(isoDate);
}

test("refresh window is active before a remaining group-stage kickoff", () => {
  const decision = refreshWindowDecision(groupFixtures, at("2026-06-23T12:00:00.000Z"));

  assert.equal(decision.active, true);
  assert.equal(decision.matchId, 2026063);
  assert.equal(decision.windowStartsUtc, "2026-06-23T11:00:00.000Z");
  assert.equal(decision.windowEndsUtc, "2026-06-23T21:00:00.000Z");
});

test("refresh window is inactive between match windows", () => {
  const decision = refreshWindowDecision(groupFixtures, at("2026-06-24T08:00:00.000Z"));

  assert.equal(decision.active, false);
  assert.equal(decision.matchId, 2026011);
  assert.match(decision.reason, /2026-06-24T13:00:00.000Z/);
});

test("refresh window includes the final", () => {
  const decision = refreshWindowDecision(KNOCKOUT_FIXTURES, at("2026-07-19T18:00:00.000Z"));

  assert.equal(decision.active, true);
  assert.equal(decision.matchId, "M104");
  assert.equal(decision.kickoffUtc, "2026-07-19T19:00:00.000Z");
});

test("refresh window is inactive after the tournament", () => {
  const decision = refreshWindowDecision(KNOCKOUT_FIXTURES, at("2026-07-20T00:00:00.000Z"));

  assert.equal(decision.active, false);
  assert.equal(decision.reason, "no remaining refresh windows");
});

test("upstream commit decision is changed when no local commit is recorded", () => {
  const decision = upstreamCommitDecision(
    { source: {} },
    { sha: "abc123", date: "2026-06-24T15:37:07Z", htmlUrl: "https://example.test/abc123" }
  );

  assert.equal(decision.changed, true);
  assert.equal(decision.localCommitSha, null);
  assert.equal(decision.latestCommitSha, "abc123");
});

test("upstream commit decision is unchanged for the recorded commit", () => {
  const decision = upstreamCommitDecision(
    { source: { commitSha: "abc123" } },
    { sha: "abc123", date: "2026-06-24T15:37:07Z", htmlUrl: "https://example.test/abc123" }
  );

  assert.equal(decision.changed, false);
  assert.equal(decision.localCommitSha, "abc123");
});

test("combined refresh is active outside match windows when upstream changed", () => {
  const refreshWindow = refreshWindowDecision(groupFixtures, at("2026-06-24T08:00:00.000Z"));
  const combined = combinedRefreshDecision(refreshWindow, {
    changed: true,
    localCommitSha: "1111111111111111111111111111111111111111",
    latestCommitSha: "2222222222222222222222222222222222222222",
  });

  assert.equal(refreshWindow.active, false);
  assert.equal(combined.active, true);
  assert.equal(combined.upstreamChanged, true);
  assert.match(combined.reason, /upstream openfootball commit changed/);
});
