# MCP Wales

A small, open-source, read-only [Model Context Protocol](https://modelcontextprotocol.io/) server for trusted public data in Wales, starting with Cardiff.

Visit [mcp.wales](https://mcp.wales). Connect an MCP client to `https://mcp.wales/mcp` without authentication.

| Data | Tools | Coverage and freshness |
| --- | --- | --- |
| Food hygiene | `find_food_businesses`, `get_food_business`, `summarize_food_businesses_by_ward` | Cardiff; live records, dated snapshots for ward searches/aggregates |
| Schools | `find_schools`, `get_school`, `summarize_schools_by_ward` | Cardiff maintained schools; manually refreshed register and StatsWales snapshots |
| Census 2021 | `find_census_areas`, `get_area_demographics`, `compare_area_demographics`, `rank_areas_by_demographic` | All 22 Welsh local authorities and Cardiff wards/MSOAs; live requests to pinned historical datasets |

Food ratings describe hygiene, not food quality. School statistics describe their published census period, and Census 2021 figures describe 2021 rather than today's population. Responses include source information and dates.

Two live rail tools are enabled in production: `get_live_departures` and `get_next_trains`, covering direct National Rail services across Great Britain. Local, Preview and production checks passed on 23 October 2026; actual assistant selection remains to be tested. Rail remains optional through its enable flag. See [rail setup and limitations](docs/rail.md).

The waste-collection prototype is disabled by default pending reuse and release checks. See [operations](docs/OPERATIONS.md#waste-collection-spike).

## Run locally

Install Node.js 24 or later and npm. Python 3 is also required for the offline checks; curl is required for live source-freshness checks and geography refreshes. No API keys or environment variables are needed for the default tools.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`; the MCP endpoint is `http://localhost:3000/mcp`.

Before submitting a change, run the same offline checks as CI:

```bash
npm run check
```

For live checks against the local production build, run `npm run build` followed by `npm run test:smoke`. These require internet access and responsive upstream services. See [contributor checks](CONTRIBUTING.md#checks).

## Find your way around

| I want to… | Read |
| --- | --- |
| Use a tool or understand its results | [Tool guide](docs/TOOLS.md) |
| Change the code or run checks | [Contributing](CONTRIBUTING.md) |
| Update data, deploy or investigate a failure | [Maintenance and operations](docs/OPERATIONS.md) |
| Check source definitions, dates or licences | [Data source register](DATA_SOURCES.md) |
| Understand ward matching and its accuracy | [Geography reference](docs/geography.md) |
| Understand safeguards and when to add infrastructure | [Quality strategy](QUALITY.md) |
| Test whether tools improve assistant answers | [Assistant evaluation guide](docs/ai-evaluations.md) |
| See what was actually verified | [Dated acceptance records](ACCEPTANCE.md) |
| See priorities and possible extensions | [Roadmap](ROADMAP.md) |

The [engineering assessment](docs/engineering-assessment.md) and [migration notes](MIGRATION.md) are historical context, not current release acceptance.

## Design and licence

```text
MCP client → /mcp route → tool validation and responses → source connectors or bundled snapshots
```

Next.js hosts the public information page and MCP endpoint on Vercel. There is no database, account system or LLM dependency. Keep changes small and sources public and read-only.

Project code is MIT-licensed. Public datasets have separate attribution and licence requirements; see [DATA_SOURCES.md](DATA_SOURCES.md).

## Design guidance

Read the [design principles](docs/design-principles.md) and use the [tool checklist](docs/tool-design-checklist.md) before changing tools. See the [privacy statement](docs/privacy.md) for data handling and hosting boundaries. Contributor instructions and required checks live in [Contributing](CONTRIBUTING.md).
