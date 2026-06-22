const assert = require("node:assert/strict");
const test = require("node:test");

const { predictionFromMarkets } = require("../server");

function marketPayload(home, away, books) {
  return [
    {
      id: "event-1",
      bookmakers: books.map((book, index) => ({
        key: `book-${index + 1}`,
        markets: [
          {
            key: "h2h",
            outcomes: [
              { name: home, price: book.home },
              { name: "Draw", price: book.draw },
              { name: away, price: book.away },
            ],
          },
          {
            key: "totals",
            outcomes: [
              { name: "Over", price: book.over, point: book.total },
              { name: "Under", price: book.under, point: book.total },
            ],
          },
          {
            key: "spreads",
            outcomes: [
              { name: home, price: book.homeSpreadPrice, point: book.homeSpread },
              { name: away, price: book.awaySpreadPrice, point: -book.homeSpread },
            ],
          },
        ],
      })),
    },
  ];
}

test("1X2 plus totals and spread infer nonzero underdog goals when xG supports it", () => {
  const fixture = { home: { name: "Favorite" }, away: { name: "Underdog" } };
  const payload = marketPayload("Favorite", "Underdog", [
    {
      home: 1.75,
      draw: 3.7,
      away: 5.1,
      total: 2.5,
      over: 1.88,
      under: 1.92,
      homeSpread: -1,
      homeSpreadPrice: 1.95,
      awaySpreadPrice: 1.87,
    },
    {
      home: 1.8,
      draw: 3.6,
      away: 4.8,
      total: 2.5,
      over: 1.83,
      under: 1.99,
      homeSpread: -1,
      homeSpreadPrice: 1.9,
      awaySpreadPrice: 1.91,
    },
  ]);

  const prediction = predictionFromMarkets(fixture, { theOddsApi: payload, oddsApiIo: [] });

  assert.deepEqual(prediction.score, { home: 2, away: 1 });
  assert.equal(prediction.evidence.marketUsed, "1x2_totals_spread");
  assert.equal(prediction.evidence.probabilities.home > prediction.evidence.probabilities.away, true);
  assert.equal(prediction.evidence.expectedGoals.away >= 0.68, true);
});

test("large mismatches can still project a clean sheet", () => {
  const fixture = { home: { name: "Favorite" }, away: { name: "Longshot" } };
  const payload = marketPayload("Favorite", "Longshot", [
    {
      home: 1.18,
      draw: 7,
      away: 15,
      total: 2.5,
      over: 1.9,
      under: 1.9,
      homeSpread: -2,
      homeSpreadPrice: 1.9,
      awaySpreadPrice: 1.9,
    },
  ]);

  const prediction = predictionFromMarkets(fixture, { theOddsApi: payload, oddsApiIo: [] });

  assert.deepEqual(prediction.score, { home: 2, away: 0 });
  assert.equal(prediction.evidence.expectedGoals.away < 0.68, true);
});
