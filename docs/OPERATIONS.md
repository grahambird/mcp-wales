# Deployment and operations

[Project overview](../README.md) · [Contributing](../CONTRIBUTING.md)

## Deploy to Vercel

1. Push this repository to GitHub.
2. In Vercel, choose **Add New → Project**, import the repository, and accept the detected Next.js settings.
3. Deploy without environment variables. New Vercel projects use Fluid Compute by default. Do not enable the waste feature in production until the release gate below is cleared.
4. Add `mcp.wales` as the production custom domain in Vercel. Visit `https://mcp.wales` and run the smoke client against production:

   ```bash
   npm run smoke:client -- https://mcp.wales
   ```

5. In **Project → Firewall → Configure**, create and publish this WAF rule:
   - condition: request path equals `/mcp`;
   - action: **Rate Limit**;
   - algorithm: **Fixed Window**;
   - limit: **120 requests in 60 seconds**;
   - counting key: **IP address**;
   - response: default HTTP `429`.

This is a deliberately generous starting limit for an MCP client. Review it if ChatGPT or another MCP host uses shared outbound addresses and legitimate requests receive `429` responses. The firewall is configured in Vercel rather than in this repository; Vercel Hobby currently permits one custom firewall rule.

The code also applies an eight-second FSA timeout, permits no more than 20 records per page, caps pages at 10, and caches successful upstream responses for five minutes in warm instances. FSA cache capacity is 100 entries, with identical in-flight requests deduplicated. Outgoing FSA concurrency is two per warm instance, waiting within a 20-second operation deadline. Responses are limited to 512 KiB; the eight-second timeout includes body reading. HTTP 429 Retry-After establishes a per-instance cooldown; requests are not automatically retried. These limits are not deployment-wide.

## Logging and monitoring

Each tool call writes a single structured JSON event to Vercel Runtime Logs. It records the tool name, success or error outcome, duration, result count where useful, and a safe error code/upstream status. It deliberately does **not** log tool arguments, search text, establishment IDs, prompts, IP addresses, or user-agent strings.

The gated waste connector additionally logs `upstream_request` and `upstream_cache` events containing only provider, operation, duration, outcome, status category, retry count, and cache hit/miss. It never logs addresses, postcodes, UPRNs, JWTs, or request bodies.

To inspect events, open the Vercel project and choose **Logs**, then search for `mcp_tool_call`, a tool name, or an error code such as `throttled`. On the Hobby plan, Runtime Log retention is currently one hour, so this provides immediate troubleshooting rather than long-term analytics. Persistent log drains and longer-term alerting are deferred until traffic justifies a paid plan or external service.

## Security and privacy

`/mcp` is intentionally public and unauthenticated. All tools are read-only and accept narrow, validated inputs. The service does not request, store, or transmit user credentials, private ChatGPT data, or personal account data. Do not add secrets to the repository; use Vercel environment variables if a future source needs credentials.

Remote MCP servers can receive prompt-derived tool arguments. Only connect servers you trust and avoid placing sensitive information in searches.

## Waste collection spike

The spike implements two optional tools:

- `find_waste_collection_addresses` accepts a postcode, optional house number, and limit. It returns bounded matches but never chooses a property.
- `get_waste_collections` accepts the selected UPRN as a string and returns only dates supplied by Cardiff Council.

To exercise them in a local or Vercel preview environment:

```bash
CARDIFF_WASTE_TOOLS_ENABLED=true npm run dev
```

After building, `CARDIFF_WASTE_TOOLS_ENABLED=true npm run test:smoke` verifies that MCP discovery includes all twelve tools while retaining the existing live FSA checks. Waste execution remains covered by mocked deterministic tests until a private property is supplied for the gated acceptance check.

The connector uses a five-minute address cache, a fifteen-minute collection cache, short-lived JWT caching, single-flight request deduplication, and at most two outgoing Cardiff requests per warm instance. It retries transient network, `429`, and `5xx` failures once; it does not retry `400`, `401`, or `403`. Cache keys are SHA-256 hashes rather than raw location identifiers. These controls are per Vercel instance, not deployment-wide.

Do not enable the tools in production until Cardiff Council confirms third-party reuse and attribution, private address-selection checks pass, and the flow succeeds from a Vercel preview. Record those checks in [ACCEPTANCE.md](../ACCEPTANCE.md).

Collection dates are schedules, not proof of collection. The server does not infer future dates and does not treat missing data as “no collection.” Short-notice changes should be checked using the official lookup and collection-updates pages.

## Cost and limitations

The expected incremental cost for low-volume development is £0: the FSA API is free, public GitHub repositories are free, and this service should fit comfortably within Vercel Hobby limits. Usage limits and product availability can change.

Not included in this milestone: Welsh responses, location/distance search, school inspections/performance, persistent analytics or caching, authentication, maps, menus, opening hours, bookings, alerts, MCP widgets, or public directory submission.

## HTTP guard and privacy

The route caps POST bodies at 64 KiB before handler JSON parsing, returning 413 above that limit. Supplied Origin values must exactly match `https://mcp.wales`, the deployment's `VERCEL_URL` or `VERCEL_BRANCH_URL` origin, or `http://localhost:3000` / `http://127.0.0.1:3000` in development. No-Origin clients remain supported. Incoming Host and forwarded headers never extend this list. A future browser client needs an intentional trusted-origin addition in `src/mcp/http-guard.ts` and matching tests; do not reflect arbitrary origins or enable wildcard access.

See the [privacy statement](privacy.md) for provider recipients, cache retention and the distinction between application logs and hosting/firewall network logs. Verify the deployed WAF and hosting retention settings separately; repository tests cannot verify them. Read the [assessment](engineering-assessment.md) before directory submission.


## Updating public data

A refresh means updating the saved public data used by the tools. It does not mean refreshing the MCP connection in ChatGPT. All ten default tools are retained; these procedures describe the existing implementation.

| What changed? | Procedure | Geography rebuild needed? |
| --- | --- | --- |
| School register | [School register](#school-register) | Yes, before final checks, because associations refer to the register snapshot |
| Pupil or FSM statistics | [StatsWales](#statswales-school-statistics) | No; these files are independent of school locations |
| FSA ward snapshot | [Geography and FSA](#geography-and-fsa-ward-snapshots) | Yes; unfiltered food searches and details remain live |
| Boundaries or postcode reference data | [Geography and FSA](#geography-and-fsa-ward-snapshots) | Yes, using the retained source snapshots |
| Census dataset version | [ONS source definitions](../DATA_SOURCES.md#ons-census-2021) | Review definitions and acceptance before changing a pin |

Read the relevant [source definitions and licence](../DATA_SOURCES.md) before importing. Review the candidate and changes, run `npm run check`, then deploy the complete tested revision and run the production smoke client. Failed acquisition or validation must leave the deployed version unchanged. Record checks actually performed in [ACCEPTANCE.md](../ACCEPTANCE.md).

### School register

1. Check the official register page for a newer release and its publication date. Download its linked ODS locally; do not assume the old URL is current.
2. Use Python 3 (standard library only) to regenerate the snapshot:

   ```bash
   python3 scripts/import-schools.py /path/to/register.ods --published-at YYYY-MM-DD --download-url https://www.gov.wales/path/to/register.ods
   ```

3. Review changes in counts, identifiers, school details and language labels. The importer rejects changed columns, missing required fields and duplicate IDs. Investigate unexpected removals rather than inferring closures.
4. Rebuild geography associations against the updated register using the procedure below, then run `npm run check`, review the JSON diff, and deploy the complete reviewed update. A failed import must not replace the previous snapshot.

The importer selects only the `Maintained` sheet and Cardiff LA code; it neither adds application dependencies nor performs network requests. Runtime searches use bundled JSON.

### StatsWales school statistics

Python 3 standard library only; no network calls in the importer or runtime school tools.

1. Choose one kind and its dataset ID above. Check its dataset page, English metadata, definitions and reporting period. Record the census date from the relevant official census report, not from the publication timestamp.
2. Download metadata before, the full supported CSV, then metadata after. The export preserves source notes and published rounding. No HTML scraping or undocumented endpoint is needed:

   ```bash
   curl -fsS "https://api.stats.gov.wales/v2/DATASET_ID?language=en-gb" -o /tmp/metadata-before.json
   curl -fsS "https://api.stats.gov.wales/v2/DATASET_ID/data?format=csv&language=en-gb" -o /tmp/schools.csv
   curl -fsS "https://api.stats.gov.wales/v2/DATASET_ID?language=en-gb" -o /tmp/metadata-after.json
   ```

3. Create a candidate and change report (replace kind, period and date as appropriate):

   ```bash
   python3 scripts/import-statswales.py characteristics /tmp/schools.csv --metadata-before /tmp/metadata-before.json --metadata-after /tmp/metadata-after.json --period 2025/26 --census-date 2026-01-20 --candidate /tmp/characteristics-candidate.json --report /tmp/characteristics-report.json
   ```

   The importer refuses to write directly to its canonical snapshot. It checks dataset/revision consistency, columns, identifiers, duplicate measures, period, numeric ranges, notes and rounding. Changed schemas or unfamiliar notes require source review before adapting the parser. It validates all input rows before narrowing to Cardiff. Cardiff authority and the 681 school prefix must agree in characteristics; the other exports use these validated Welsh school identifiers. Geography codes are not school IDs.

4. Review the report: missing register schools, unmatched Cardiff IDs, added/removed IDs, changed records, source characteristics, periods/revisions, pupil changes above 20%, and same-period year-group discrepancies. Changes may be valid. Never infer closure or silently change IDs. Retain raw inputs and reports outside the runtime bundle for audit.
5. After review, copy the candidate beside the destination and rename it into place, so replacement is atomic. Update only the selected source:

   ```bash
   cp /tmp/characteristics-candidate.json src/schools/statswales/characteristics.json.pending
   mv src/schools/statswales/characteristics.json.pending src/schools/statswales/characteristics.json
   npm run check
   ```

6. Review the Git diff and deploy the tested update. Git preserves previous snapshots. If download or validation fails, stop before promotion; the previous snapshot remains intact. When updating totals and year groups separately, check the report again after both imports. Different periods stay explicitly labelled in profiles and are not combined.

### Geography and FSA ward snapshots

Run commands from the repository root using Node 24+, Python 3 and curl. Large raw inputs stay outside the application bundle. Retain input directories and reports locally for audit; do not commit the full national products. A fresh input directory checks publisher corrections; an existing directory reuses its pinned downloads.

**Reference preparation**, independent of schools/FSA acquisition:

```bash
python3 scripts/download-geography.py /tmp/geography-inputs
python3 scripts/prepare-geography.py /tmp/geography-inputs --candidate /tmp/geography-references
```

Download is restricted to official lookup membership and explicit ward codes, with complete service pagination and cardinality checks. Preparation validates checksums, scope, codes, rings, coordinate system and statistical/postcode hierarchies before writing a candidate. The raw `inputs.json` manifest pins all acquired files. To reproduce exactly, retain that directory; publishers may correct data in place.

**FSA source refresh**, independent of references and association calculation:

```bash
curl -fsSL --max-time 60 https://ratings.food.gov.uk/api/open-data-files/FHRS556en-GB.xml -o /tmp/cardiff-fsa.xml
python3 scripts/import-fsa.py /tmp/cardiff-fsa.xml --expected-count COUNT_FROM_OFFICIAL_LISTING --candidate /tmp/fsa-source.json
```

Use the count for that extract from the [official download listing](https://ratings.food.gov.uk/open-data), not a fixed historical count. If listing and extract disagree, stop and acquire a consistent pair; never weaken completeness validation. The XML header count, success status, Cardiff scope, scheme and unique FHRSIDs are checked. This is a full supported authority export, not exhaustive runtime search.

**Incremental enrichment**, from existing local source files:

```bash
node scripts/build-geography.mts --references /tmp/geography-references --schools src/schools/directory.json --fsa /tmp/fsa-source.json --previous src/geography/data/W06000015 --candidate /tmp/geography-release
node scripts/verify-geography.mts /tmp/geography-release src/schools/directory.json /tmp/geography-release/fsa-source.json
```

For a source-only refresh, `--references src/geography/data/W06000015` reuses existing references. For a reference-only rebuild, `--fsa src/fsa/source.json` reuses retained FSA data. A school-only update uses the normal school importer, then rebuilds against existing FSA and references. Both association candidates are emitted as a consistent set, but unchanged records retain their calculations. No source downloads occur in the builder.

Location fingerprints include normalised address, postcode and coordinates: a same-postcode relocation is reconsidered; rating/name-only updates do not cause location recalculation. New records are calculated, missing IDs are removed from the new association population and reported without inferring closure. A reference or matcher-version change invalidates affected authority associations. Add `--full` to recalculate everything. Review `report.json` for reuse, recalculation, removals and unresolved counts.

**Promotion**: review the candidate/report, then copy the candidate's reference, spatial-relation, association and release files together into `src/geography/data/W06000015/`; copy `fsa-source.json` to `src/fsa/source.json`. Preserve independently updated school source files. Run `npm run check`, review the Git diff and deploy the whole tested revision. `npm run build` also verifies manifest checksums, source fingerprints, association populations and versions before Next builds. A partial copy cannot produce a successful release build.

Production publication is atomic at the immutable deployment level. Candidate files and local edits are not served to production. If acquisition, validation or build fails, leave the deployed version alone. Roll back the complete Git revision/deployment; do not roll back one association file independently. No runtime filesystem writes occur.

## Scheduled checks and freshness review

`.github/workflows/source-freshness.yml` runs on the first of each month at
08:23 UTC and can also be started with **Run workflow** in GitHub Actions.
It compares the school-register ODS link, workbook SHA-256 and available page
modification metadata, StatsWales revision IDs and reporting periods, and ONS
latest-version links with committed snapshots and pins. It does not import,
change dataset versions, or deploy anything. Geography remains a manual review
because newer boundaries may not match Census 2021.

Run locally with Python 3 and curl (no npm dependencies or credentials):

```bash
python3 scripts/test-source-freshness.py
python3 scripts/check-source-freshness.py --report /tmp/source-freshness.md
```

Each source reports unchanged, update available, or check failed. An update
requires the existing manual review/import/test/deploy procedure above. A check
failure fails the workflow and requires investigating availability or metadata
shape; it never counts as unchanged. This is a change detector, not a guarantee
that the publisher has corrected every outdated record.

The workflow publishes a run summary and maintains one bot-owned GitHub issue,
“Review public-source freshness”, while updates or failures remain. An unchanged
report does not create an issue; when all checks become unchanged, the existing
issue closes. Issue creation uses only the workflow's built-in GitHub token with
`issues: write`; no additional secret is needed. Repository Issues and scheduled
Actions must be enabled. The schedule starts after the workflow reaches the
default branch; GitHub may delay scheduled runs. Source checks run sequentially
with bounded downloads and timeouts.



The daily [production canary](../.github/workflows/production-smoke.yml) checks the deployed service using stable invariants. See [QUALITY.md](../QUALITY.md) for its scope and failure handling. A failed check requires investigation; it is not permission to weaken an invariant.

Full boundary and postcode files are offline rebuild inputs and are excluded from the deployed MCP bundle. The production build verifies this exclusion and prints the traced size. Historical measurements and verification evidence are in [the geography record](geography.md#quality-operation-and-release-evidence); they do not establish current Vercel settings.

## National Rail activation and station refresh

The rail integration is disabled while Rail Data Marketplace account approval and live acceptance are pending. Follow [rail configuration, bounded live checks and activation](rail.md) before setting the server-only key, approved product base URL and enable flag in Vercel. Never put the key in chat, Git, client-side settings or logs. The existing tools continue without rail configuration. The same guide documents the offline station-reference refresh; live departure data has no persistent store.
