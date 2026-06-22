# Prompt For Betting-API Research Agent

You are working in a separate repo/context that has prior research and demos around betting APIs. I need you to use that API knowledge to produce sportsbook-sentiment-based World Cup 2026 group-stage predictions that can be imported into my local World Cup Explorer app.

## App Context

The app is a local World Cup 2026 simulator. It loads group fixtures/results, computes projected group tables, ranks the 12 third-place teams, takes the best eight third-place teams, applies FIFA Annexe C for the Round of 32 third-place slots, and renders the Round of 32 bracket.

The app already has official/completed results locked. It needs predictions only for unplayed group-stage fixtures. When predictions are filled, the UI shows:

- projected group tables
- current likely best third-place qualifiers
- the Annexe C option selected by the eight qualifying third-place groups
- which countries land in each Round of 32 slot

The app can import prediction JSON with this shape:

```json
{
  "schemaVersion": 1,
  "type": "wc2026-predictions",
  "exportedAtUtc": "2026-06-20T00:00:00.000Z",
  "source": {
    "name": "sportsbook-sentiment aggregate",
    "generatedBy": "betting-api research agent",
    "notes": "Brief source/provenance summary"
  },
  "predictions": {
    "2026005": { "home": 0, "away": 2, "source": "odds" }
  }
}
```

Important import constraints:

- `predictions` keys are fixture ids from the fixture map below.
- `home` and `away` must be non-negative integer scores.
- Use `"source": "odds"` for sportsbook-derived predictions.
- Do not include predictions for fixtures that are already `FT` unless you are explicitly correcting stale local data and call that out.
- The current importer ignores extra fields inside each prediction, so put richer evidence in a separate top-level section such as `marketEvidence`.

## What I Need You To Do

1. Scan the betting APIs and demos you know about in your repo.
2. Identify which APIs currently cover FIFA World Cup 2026 markets and which markets are useful:
   - match winner / 1X2
   - Asian handicap or spread
   - totals
   - correct score, if available
   - group winner, to qualify, top-two, third-place/to-advance markets, if available
   - tournament futures only as weak priors, not as the main scoreline source
3. Aggregate sportsbook sentiment across books/providers.
4. Convert odds to de-vigged probabilities. Report overround handling.
5. Produce one integer score prediction per unplayed group fixture.
   - Prefer correct-score market mode if available and liquid.
   - Otherwise infer expected goals from 1X2 + totals + handicap/spread.
   - If only 1X2 is available, use a conservative scoreline: favorite by one goal, draw as 1-1, strong favorite by two only when the implied probability clearly supports it.
6. Return app-compatible JSON first, then a human-readable analysis.
7. Also compute the projected tables and list:
   - likely group winners and runners-up
   - ranked third-place teams, 1 through 12
   - likely eight best third-place qualifier groups as a sorted string, e.g. `"ABCDFGIJ"`
   - likely Round of 32 assignments, including venues from the venue map below
8. Be explicit about uncertainty and coverage gaps. If the APIs lack a market, say so rather than inventing precision.

## Current Fixture Map

CSV columns: `fixture_id,group,date_utc,home,away,home_goals,away_goals,status`

```csv
2026001,A,2026-06-11T19:00:00.000Z,Mexico,South Africa,2,0,FT
2026002,A,2026-06-12T02:00:00.000Z,South Korea,Czech Republic,2,1,FT
2026003,A,2026-06-18T16:00:00.000Z,Czech Republic,South Africa,1,1,FT
2026004,A,2026-06-19T01:00:00.000Z,Mexico,South Korea,1,0,FT
2026005,A,2026-06-25T01:00:00.000Z,Czech Republic,Mexico,,,NS
2026006,A,2026-06-25T01:00:00.000Z,South Africa,South Korea,,,NS
2026007,B,2026-06-12T19:00:00.000Z,Canada,Bosnia & Herzegovina,1,1,FT
2026008,B,2026-06-13T19:00:00.000Z,Qatar,Switzerland,1,1,FT
2026009,B,2026-06-18T19:00:00.000Z,Switzerland,Bosnia & Herzegovina,4,1,FT
2026010,B,2026-06-18T22:00:00.000Z,Canada,Qatar,6,0,FT
2026011,B,2026-06-24T19:00:00.000Z,Switzerland,Canada,,,NS
2026012,B,2026-06-24T19:00:00.000Z,Bosnia & Herzegovina,Qatar,,,NS
2026013,C,2026-06-13T22:00:00.000Z,Brazil,Morocco,1,1,FT
2026014,C,2026-06-14T01:00:00.000Z,Haiti,Scotland,0,1,FT
2026015,C,2026-06-19T22:00:00.000Z,Scotland,Morocco,0,1,FT
2026016,C,2026-06-20T00:30:00.000Z,Brazil,Haiti,3,0,FT
2026017,C,2026-06-24T22:00:00.000Z,Scotland,Brazil,,,NS
2026018,C,2026-06-24T22:00:00.000Z,Morocco,Haiti,,,NS
2026019,D,2026-06-13T01:00:00.000Z,USA,Paraguay,4,1,FT
2026020,D,2026-06-14T04:00:00.000Z,Australia,Turkey,2,0,FT
2026021,D,2026-06-19T19:00:00.000Z,USA,Australia,2,0,FT
2026022,D,2026-06-20T03:00:00.000Z,Turkey,Paraguay,0,1,FT
2026023,D,2026-06-26T02:00:00.000Z,Turkey,USA,,,NS
2026024,D,2026-06-26T02:00:00.000Z,Paraguay,Australia,,,NS
2026025,E,2026-06-14T17:00:00.000Z,Germany,Curaçao,7,1,FT
2026026,E,2026-06-14T23:00:00.000Z,Ivory Coast,Ecuador,1,0,FT
2026027,E,2026-06-20T20:00:00.000Z,Germany,Ivory Coast,,,NS
2026028,E,2026-06-21T00:00:00.000Z,Ecuador,Curaçao,,,NS
2026029,E,2026-06-25T20:00:00.000Z,Curaçao,Ivory Coast,,,NS
2026030,E,2026-06-25T20:00:00.000Z,Ecuador,Germany,,,NS
2026031,F,2026-06-14T20:00:00.000Z,Netherlands,Japan,2,2,FT
2026032,F,2026-06-15T02:00:00.000Z,Sweden,Tunisia,5,1,FT
2026033,F,2026-06-20T17:00:00.000Z,Netherlands,Sweden,,,NS
2026034,F,2026-06-21T04:00:00.000Z,Tunisia,Japan,,,NS
2026035,F,2026-06-25T23:00:00.000Z,Japan,Sweden,,,NS
2026036,F,2026-06-25T23:00:00.000Z,Tunisia,Netherlands,,,NS
2026037,G,2026-06-15T19:00:00.000Z,Belgium,Egypt,1,1,FT
2026038,G,2026-06-16T01:00:00.000Z,Iran,New Zealand,2,2,FT
2026039,G,2026-06-21T19:00:00.000Z,Belgium,Iran,,,NS
2026040,G,2026-06-22T01:00:00.000Z,New Zealand,Egypt,,,NS
2026041,G,2026-06-27T03:00:00.000Z,Egypt,Iran,,,NS
2026042,G,2026-06-27T03:00:00.000Z,New Zealand,Belgium,,,NS
2026043,H,2026-06-15T16:00:00.000Z,Spain,Cape Verde,0,0,FT
2026044,H,2026-06-15T22:00:00.000Z,Saudi Arabia,Uruguay,1,1,FT
2026045,H,2026-06-21T16:00:00.000Z,Spain,Saudi Arabia,,,NS
2026046,H,2026-06-21T22:00:00.000Z,Uruguay,Cape Verde,,,NS
2026047,H,2026-06-27T00:00:00.000Z,Cape Verde,Saudi Arabia,,,NS
2026048,H,2026-06-27T00:00:00.000Z,Uruguay,Spain,,,NS
2026049,I,2026-06-16T19:00:00.000Z,France,Senegal,3,1,FT
2026050,I,2026-06-16T22:00:00.000Z,Iraq,Norway,1,4,FT
2026051,I,2026-06-22T21:00:00.000Z,France,Iraq,,,NS
2026052,I,2026-06-23T00:00:00.000Z,Norway,Senegal,,,NS
2026053,I,2026-06-26T19:00:00.000Z,Norway,France,,,NS
2026054,I,2026-06-26T19:00:00.000Z,Senegal,Iraq,,,NS
2026055,J,2026-06-17T01:00:00.000Z,Argentina,Algeria,3,0,FT
2026056,J,2026-06-17T04:00:00.000Z,Austria,Jordan,3,1,FT
2026057,J,2026-06-22T17:00:00.000Z,Argentina,Austria,,,NS
2026058,J,2026-06-23T03:00:00.000Z,Jordan,Algeria,,,NS
2026059,J,2026-06-28T02:00:00.000Z,Algeria,Austria,,,NS
2026060,J,2026-06-28T02:00:00.000Z,Jordan,Argentina,,,NS
2026061,K,2026-06-17T17:00:00.000Z,Portugal,DR Congo,1,1,FT
2026062,K,2026-06-18T02:00:00.000Z,Uzbekistan,Colombia,1,3,FT
2026063,K,2026-06-23T17:00:00.000Z,Portugal,Uzbekistan,,,NS
2026064,K,2026-06-24T02:00:00.000Z,Colombia,DR Congo,,,NS
2026065,K,2026-06-27T23:30:00.000Z,Colombia,Portugal,,,NS
2026066,K,2026-06-27T23:30:00.000Z,DR Congo,Uzbekistan,,,NS
2026067,L,2026-06-17T20:00:00.000Z,England,Croatia,4,2,FT
2026068,L,2026-06-17T23:00:00.000Z,Ghana,Panama,1,0,FT
2026069,L,2026-06-23T20:00:00.000Z,England,Ghana,,,NS
2026070,L,2026-06-23T23:00:00.000Z,Panama,Croatia,,,NS
2026071,L,2026-06-27T21:00:00.000Z,Panama,England,,,NS
2026072,L,2026-06-27T21:00:00.000Z,Croatia,Ghana,,,NS
```

## FIFA Round Of 32 Slots And Venues

Use this table when answering "what countries might be going where." These locations are available from the published FIFA World Cup 26 match schedule and associated fixture schedules.

```csv
match,slot_home,slot_away,date_et,time_et,venue,city
M73,2A,2B,2026-06-28,15:00,SoFi Stadium,"Inglewood, CA"
M74,1E,3ABCDF,2026-06-29,16:30,Gillette Stadium,"Foxborough, MA"
M75,1F,2C,2026-06-29,21:00,Estadio BBVA,"Monterrey, MEX"
M76,1C,2F,2026-06-29,13:00,NRG Stadium,"Houston, TX"
M77,1I,3CDFGH,2026-06-30,17:00,MetLife Stadium,"East Rutherford, NJ"
M78,2E,2I,2026-06-30,13:00,AT&T Stadium,"Arlington, TX"
M79,1A,3CEFHI,2026-06-30,21:00,Estadio Azteca,"Mexico City, MEX"
M80,1L,3EHIJK,2026-07-01,12:00,Mercedes-Benz Stadium,"Atlanta, GA"
M81,1D,3BEFIJ,2026-07-01,20:00,Levi's Stadium,"Santa Clara, CA"
M82,1G,3AEHIJ,2026-07-01,16:00,Lumen Field,"Seattle, WA"
M83,2K,2L,2026-07-02,19:00,BMO Field,"Toronto, CAN"
M84,1H,2J,2026-07-02,15:00,SoFi Stadium,"Inglewood, CA"
M85,1B,3EFGIJ,2026-07-02,23:00,BC Place,"Vancouver, CAN"
M86,1J,2H,2026-07-03,18:00,Hard Rock Stadium,"Miami, FL"
M87,1K,3DEIJL,2026-07-03,21:30,Arrowhead Stadium,"Kansas City, MO"
M88,2D,2G,2026-07-03,14:00,AT&T Stadium,"Arlington, TX"
```

## Output Format

Return the response in this order:

1. `APP_IMPORT_JSON`

```json
{
  "schemaVersion": 1,
  "type": "wc2026-predictions",
  "exportedAtUtc": "...",
  "source": {
    "name": "...",
    "generatedBy": "betting-api research agent",
    "marketsUsed": ["1X2", "totals", "handicap", "correct score"],
    "booksOrApis": ["..."],
    "notes": "..."
  },
  "predictions": {
    "2026005": { "home": 0, "away": 2, "source": "odds" }
  },
  "marketEvidence": {
    "2026005": {
      "home": "Czech Republic",
      "away": "Mexico",
      "probabilities": { "home": 0.22, "draw": 0.28, "away": 0.50 },
      "expectedGoals": { "home": 0.9, "away": 1.4 },
      "selectedScore": "0-2",
      "confidence": "medium",
      "sources": ["..."]
    }
  }
}
```

2. `PROJECTED_OUTCOMES`

- Projected table for each group.
- Ranked third-place teams.
- Best eight third-place groups.
- Tiebreak warnings where points/GD/GF are close or exact.

3. `ROUND_OF_32_TRAVEL_VIEW`

- Match number, venue/city, slot matchup, projected countries.
- Highlight host-country implications and likely high-interest travel paths.

4. `API_COVERAGE_NOTES`

- Which APIs/books were checked.
- Which markets were usable.
- Freshness timestamps.
- Rate limits, auth needs, or legal/compliance caveats.
- Any stale/missing odds.

## Quality Bar

- Do not hallucinate odds. If an API does not expose a market, say so.
- Use timestamps for all market data.
- Do not overwrite completed fixtures.
- Keep score predictions plausible and explain the conversion from market sentiment to scoreline.
- If two teams are tied in the app's first three tiebreakers, surface that clearly because the local app falls back to seed rank/name and does not model conduct score or FIFA ranking.
