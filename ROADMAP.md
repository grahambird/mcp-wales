# Roadmap

Retain all ten default tools. Prioritise proving their usefulness and making maintenance understandable before expanding the service. This is a list of priorities and options, not a release commitment.

## Current capability

- Cardiff food hygiene discovery and live details; complete dated ward searches and rating summaries.
- Cardiff maintained-school discovery, published pupil-size sorting, combined register/StatsWales profiles and ward counts.
- Census 2021 demographics, comparisons and rankings for supported Welsh authorities and Cardiff wards/MSOAs.
- Shared official-area resolution and offline school/business location matching. Internal LSOAs do not add LSOA Census queries.

Name/rating sorting for food and name/pupil-total sorting for schools already exist. Food inspection-date sorting is unavailable in the consumed live API. A general postcode, distance or neighbourhood resolver is not currently exposed. See [the tool guide](docs/TOOLS.md) for exact contracts.

## Rail integration live

Two optional direct-train tools are enabled in production. Local and Vercel Preview/production checks passed on 23 October 2026, and the user compared local results with National Rail boards. The user confirmed the Heath High Level into Cardiff assistant retest passed after UK-local timestamp improvements; broader assistant comparisons remain pending. Subscription credit and fair-use wording are user-reported; a full independent terms/branding audit has not been performed. See [rail operations](docs/rail.md). The ten non-rail tools remain independent.

## Next priorities

1. Agree five core user questions in [the evaluation guide](docs/ai-evaluations.md), compare answers with and without MCP Wales, and record dated findings in [ACCEPTANCE.md](ACCEPTANCE.md).
2. Complete applicable assistant and production checks still recorded as pending. Do not infer completion from local tests.
3. Keep maintenance instructions together in [Operations](docs/OPERATIONS.md). Measure a full geography rebuild before deciding whether incremental reuse is worth retaining; no implementation change is agreed yet.

## Possible extensions

Start with a demonstrated user question and the [tool checklist](docs/tool-design-checklist.md), not simply an available dataset.

| Option | Evidence needed before implementation |
| --- | --- |
| Nearby schools or businesses | Suitable coordinate data; distinguish straight-line distance from catchments or admissions |
| Estyn inspections | Permitted automated access and redistribution; direct links do not establish permission for structured findings |
| School exam results/trends | Supported school-level export/API or explicit permission; the examined national workbook does not provide school results |
| School history, closures and mergers | Authoritative dated mappings using Welsh school identifiers |
| Catchments, term dates and capacity | Structured access, reuse terms and school-specific coverage; admission numbers are not capacity or vacancies |
| Census LSOAs or other authorities’ subdivisions | Authoritative dated membership, bounded queries, completeness tests and live acceptance |
| Neighbourhood aliases | Authoritative boundary evidence; never silently substitute a ward |
| Current population estimates | Separate source and reporting dates, clearly distinct from Census 2021 |
| Waste collections | Existing reuse, attribution and release gate in [Operations](docs/OPERATIONS.md#waste-collection-spike) |

Other source ideas remain unprioritised: UK-AIR air quality, OS Open Greenspace, Cadw listed buildings, visitor attractions, police crime data, NaPTAN stops, Cardiff Bus open data, post offices/postboxes, planning applications, further/higher education and local representatives. Access and reuse terms need review when a concrete question warrants one.

Do not scrape unsupported endpoints, introduce school-quality rankings or add infrastructure in anticipation of these options. Follow [QUALITY.md](QUALITY.md#adoption-triggers).
