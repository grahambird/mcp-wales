# Quality strategy

Use the smallest quality system that provides useful confidence. Mocked contracts define behaviour controlled by MCP Wales; live public data can legitimately change. Commands and prerequisites are in [Contributing](CONTRIBUTING.md#checks), maintenance procedures in [Operations](docs/OPERATIONS.md#updating-public-data), and dated evidence in [ACCEPTANCE.md](ACCEPTANCE.md).

## Checks on every change

`npm run check` is the shared local and CI gate: lint, types, Vitest (including offline Python importer checks), maintenance tests and a production build. Tests cover:

| Area | Stable behaviour to preserve |
| --- | --- |
| Food | Cardiff enforcement, filtering, all four upstream sort mappings, bounded pagination, pending/non-numeric ratings, sentinel dates, source metadata and errors |
| Schools | Directory filters, language classifications, sorting before pagination, pupil-total coverage and missing/suppressed values last, profile identity and independent reporting periods |
| Importers | Required columns, identifiers, scope, completeness, periods/revisions, rounding, suppression and preservation of existing files on failure |
| Census | Official area resolution and ambiguity, supported topics, category ordering, topic-specific denominators, age 65 and 100+, complete rankings, ties and bounded requests |
| Geography | Coordinate containment, holes/multipolygons/edges/overlaps/gaps, postcode quality and termination, partial resolution, association reuse/invalidation and complete population reconciliation |
| Service | Cache bounds/expiry/deduplication, concurrency/deadlines/cooldowns, request and response limits, Origin validation, safe errors/logs, untrusted content, nested output schemas and legacy/current MCP compatibility |
| Gated rail | Name/CRS resolution, intermediate calls and changes, actual departures, delays/cancellations, London clocks, bounded cache/retries/cooldown, malformed/failed providers and secret-safe results; dated live filtering evidence in acceptance |
| Gated waste | Explicit address selection, string UPRNs, malformed/empty schedules, unknown source labels, throttling, caches and privacy-safe logging; no real residential fixtures |

Sorting applies to the complete matching population before pagination: locally for snapshots, upstream where supported. Never sort a page as though it were the complete dataset or exhaust an upstream API to simulate unsupported sorting.

School source differences and mismatched same-period year-group sums remain visible. Import reports flag coverage losses and pupil changes above 20% for review rather than assuming they are errors. Independent statistics retain their own reporting dates.

Both ward summaries reconcile all ward counts plus unresolved records with the complete filtered population. Release verification rejects inconsistent source/reference/association files. Production builds also reject offline boundary/postcode inputs in the MCP runtime bundle.

Synthetic fixtures control mutable behaviour. Dated bundled geography examples check the committed reference release. Neither establishes current live values. See [the geography evidence](docs/geography.md#quality-operation-and-release-evidence).

## Daily production canary

The [scheduled smoke client](.github/workflows/production-smoke.yml) checks:

- Discovery of all ten default read-only tools and the two enabled rail tools.
- Bounded live rail contracts for station resolution, both Heath routes, result/status shapes, cancellation predictions and attribution. No fixed service values.
- Bounded live FSA search and dynamically selected detail, valid ratings, Cardiff scope, attribution and source links.
- Dynamically selected school discovery/profile, identifiers, source dates and statistical value/status shapes.
- Cardiff Census population and a bounded complete-area ward ranking, official codes, historical dates, topic denominators, percentage arithmetic, unrounded ordering and attribution.
- Complete ward-summary reconciliation, snapshot dates and bounded ward discovery.

Do not pin live establishment names, IDs, ratings, dates, school counts or demographic values. An upstream outage is a surfaced failure, not a silently skipped check. Waste remains excluded while its release gate is off.

## Assistant and release checks

Use [the assistant evaluation guide](docs/ai-evaluations.md) for representative questions with and without MCP Wales. Offline prompt fixtures validate expected arguments and tool contracts; they do not measure actual tool selection, interpretation or answer improvement.

Record performed checks, failures and pending work in [ACCEPTANCE.md](ACCEPTANCE.md). Local tests cannot prove Vercel-origin access, deployed firewall/log settings or signed-in ChatGPT behaviour. Preserve historical records rather than treating old results as current acceptance.

The reported 18-call largest-school query led to pupil-total sorting in discovery. The live FSA coordinate-casing defect became a deterministic regression fixture. Follow that pattern: turn confirmed project defects into targeted regression tests.

## Failure handling

Classify a failure as a project regression, upstream availability/data change, hosting problem or MCP-host behaviour change. Investigate before changing a check; do not weaken an unexplained invariant to make CI green. Compare numerical answers with the same source table/version and geography, respecting disclosure-control differences and missing/suppressed data.

## Adoption triggers

| Improvement | Introduce only when |
| --- | --- |
| More prompt cases | An observed failure or new supported task warrants them |
| Automated model evaluations | Frequent prompt behaviour changes justify API cost and grader maintenance; calibrate against human review |
| Persistent monitoring/alerting | Traffic or reliability needs exceed the existing hosting logs and canary |
| Distributed caching or analytics | Measured traffic, latency or provider limits require them |
| Automated ChatGPT UI testing | Account-specific manual acceptance stops being quick and reliable |
| Waste production release | Council reuse/attribution guidance and required private/Vercel checks are recorded in acceptance |

Do not add a database, hosted evaluation platform, LLM dependency, authentication or paid infrastructure without demonstrated need and explicit approval. Use the [design principles](docs/design-principles.md) and [tool checklist](docs/tool-design-checklist.md) for tool changes; reuse existing cache, logger, HTTP guard and output schemas.
