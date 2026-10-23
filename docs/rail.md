# Live National Rail departures — awaiting live acceptance

The two questions are “When is the next train from Heath High Level?” and “When is the next train to Heath High Level from Cardiff Central?”. Only direct passenger trains are supported, across Great Britain. Northern Ireland is outside Darwin coverage. No journey planner, tickets, database, new dependencies or extra hosting.

## API investigation (22 October 2026)

Read the official [JSON documentation](https://realtime.nationalrail.co.uk/LDBWS/docs/documentation.html) and its linked [OpenAPI specification](https://realtime.nationalrail.co.uk/LDBWS/static/ldbws.json), version `20220120.LDBWebService` v1, before implementation. This is the public JSON service, not a SOAP proxy or staff feed.

`GetNextDeparturesWithDetails/{crs}/{filterList}` returns **one** service per requested destination, not a list of upcoming trains for one destination. Repeated time-offset queries risk skipping simultaneous trains and delayed services; they are not used.

The smallest candidate workaround is one `GetDepBoardWithDetails/{crs}` request with `numRows=10`, `filterCrs=<destination>`, `filterType=to`, `timeOffset=0`, `timeWindow=120`. It returns multiple services and subsequent calling points. The implementation independently requires a matching subsequent calling point and excludes groups explicitly requiring a change or a non-train leg. It preserves cancellations at the origin, the requested stop and associated portions. Without a destination the board is unfiltered, so both directions are eligible.

**Unresolved upstream contract:** the OpenAPI description says the board filter matches originating/terminating locations. It does not explicitly establish that intermediate destinations are included. Consequently, mocked tests do not prove this workaround works for CDF → HHL. Do not enable production until live acceptance proves multiple intermediate-stop results. An empty filtered board is not evidence that no direct route exists. If live checks show the filter only matches final destinations, this implementation must change before activation: inspect unfiltered departure-board services with calling points/service details within explicit provider bounds, and disclose truncation. Do not disguise a capped sample as all upcoming direct trains or build a journey planner.

`GetServiceDetails/{serviceId}` exposes actual departure `atd`, which board items lack. Up to ten bounded detail calls exclude confirmed departures without dropping trains merely because their scheduled/expected time is past. An expired/null detail, malformed response or failed detail call fails the operation as unavailable, rather than pretending there are no trains. The connector uses the board's generation time for its HH:mm values, converts known times to ISO UTC with Europe/London clock rules, and returns null for uncertain/repeated autumn clock times. No timetable-derived prediction is invented.

The public schema's host is `localhost`/HTTP and its documentation describes Basic authentication. Do not use that generated host as a deployment endpoint. Configure the actual HTTPS product base URL and authentication from the approved RDM subscription. The user-supplied Marketplace curl examples on 23 October 2026 confirm `x-apikey` for both products. Departure boards and Service Details have separate product base URLs and independently configured keys; never send the board key to the details product as a fallback. The host/path allowlist prevents accidental credential forwarding; redirects are rejected.

## Local live evidence — 23 October 2026

Both product keys authenticated through the local MCP server. The bounded smoke passed HHL by name and CRS (five results each), CDF → HHL (four) and CDF → HLL (three). Destination results require matching subsequent calling points, confirming multiple intermediate-stop results for this sample. Counts are observations, not invariants. A live-discovered HTTP 400 for literal `filterCrs=null` was fixed by omitting optional filters when no destination is requested; regression coverage asserts omission. The user subsequently compared results retrieved at 19:15:44–45 BST with National Rail boards and reported agreement, with roughly one-minute differences in revised delayed-train departure predictions. This is user-reported acceptance for the sample, not a synchronized feed audit. Protected Vercel Preview initialization, 12-tool discovery and all four bounded live rail cases subsequently passed on 23 October 2026 using authenticated CLI requests; both product subscriptions work from Vercel. See ACCEPTANCE.md for the deployment URL and exact scope. Production acceptance below remains pending.

## Configuration and acceptance after account approval

On 23 October 2026 the user confirmed Marketplace account access and free Live Departure Board and Service Details products, and supplied both endpoints and redacted curl examples. The user reports both require credit to “National Rail”; results include “Powered by National Rail.” Full subscription terms/quotas and any additional branding requirements still need review. Local credentials and live provider access have subsequently been verified as recorded above; no deployment has been performed.

Add server-only values to `.env.local` and Vercel preview environment settings, never chat, source control or a `NEXT_PUBLIC_` setting:

```dotenv
NATIONAL_RAIL_API_KEY=<Live Departure Board consumer key>
NATIONAL_RAIL_API_BASE_URL=https://api1.raildata.org.uk/1010-live-departure-board-dep1_2/LDBWS/api/20220120
NATIONAL_RAIL_SERVICE_DETAILS_API_KEY=<Service Details consumer key>
NATIONAL_RAIL_SERVICE_DETAILS_API_BASE_URL=https://api1.raildata.org.uk/1010-service-details1_2/LDBWS/api/20220120
NATIONAL_RAIL_TOOLS_ENABLED=true
```

The tools are absent from discovery unless the explicit enable flag is true. Missing/invalid configuration produces an execution error with code `unavailable`. Existing tools require no rail credentials. Keep production disabled until the following are recorded:

Use each product’s own Consumer Key from its subscription. The connector requires both keys and both URLs; it does not assume keys are interchangeable. The board product supplies `GetDepBoardWithDetails/{crs}`; the separate details product supplies `GetServiceDetails/{serviceid}`.

1. Check the subscribed product's actual OpenAPI/base URL, auth header, quotas, terms and supported operations against the client.
2. Enable in a local/preview environment and run `node scripts/test-rail-client.mjs http://127.0.0.1:3000` (or supply the preview URL).
3. During service hours compare both HHL directions and CDF → HHL with the official National Rail board. Confirm **multiple** trains are returned to intermediate HHL with correct arrivals and ultimate destinations. Compare CDF → HLL too, including an honestly empty direct result if applicable. The bounded smoke script validates shapes; manual source comparison establishes intermediate-stop coverage.
4. Verify Vercel-origin access and provider failures; record the actual evidence. Do not fix production names, IDs, platforms, train counts or times in the daily canary. Extend the canary's discovery environment flag when activating production.
5. Compare assistant answers for the two original questions and “Next train from HHL?” with/without MCP Wales; record selection, calls, handling of unknown/cancelled trains and attribution. No manual assistant baseline or evaluation has been performed yet.
6. Confirm attribution presentation meets the subscription's NRE developer/brand guidelines, including any logo requirement or agreed text-only treatment for MCP outputs.
7. Run `npm run check`, deploy the tested revision with the existing Vercel process, enable production, then perform the bounded production check. Do not mark this done based on a local build.

## Runtime safeguards and result semantics

Responses contain origin/requested destination, retrieval and board-generation times, services, provider attribution, source URL and limitations. Each service keeps scheduled and predicted departure/arrival separately, ultimate destinations, explicit nulls, status, delay minutes and information mode (`live`, `timetable_only`, `unavailable`). A missing prediction never becomes an on-time claim. Cancelled departures/stops have null predictions and must never be offered as available trains. Results are sorted by predicted departure, falling back to scheduled time when prediction is unavailable, then limited to 1–10 (default 5).

The API window is 120 minutes; at most ten provider services are examined. This is not a complete timetable or proof of the last train of the day. Empty boards and provider-suppressed boards have distinct explanations; transport/malformed/auth failures are execution errors, never successful empty boards.

Safeguards are instance-local: 15-second bounded successful-response cache with concurrent request deduplication, two active requests, up to 20 starts per ten seconds, 256 KiB streamed-response cap, 6-second request timeout and 20-second operation deadline. At most one retry for network/server failures; no retry for auth, malformed data or throttling, with Retry-After cooldown. Existing MCP HTTP size/origin checks still wrap these tools. Provider diagnostics, keys and query arguments are never logged; logs contain only outcomes, counts, timing and status. Live data is never persisted. Individual cached response retrieval times remain the actual fetch time, not the time a cache entry was read.

## Station reference maintenance

The independent resolver uses `src/rail/stations.json`, a small local name/CRS reference, not a live timetable. It contains 2,648 distinct active station name/code references from the official DfT [NaPTAN rail-area XML export](https://naptan.api.dft.gov.uk/v1/access-nodes?atcoAreaCodes=910&dataFormat=xml), downloaded 22 October 2026. The export itself reports modification time 25 May 2025; downloading it now does not make that source vintage current. Names have the transport-mode suffix removed. CRS matching is case-insensitive; normalized names accept parentheses, punctuation and `&`/`and`. Partial/ambiguous matches require an explicit full name or CRS selection, never a guess. Unknown errors mention that newly opened stations may require a refresh.

Download the official export only during maintenance, then run:

```bash
python3 scripts/import-rail-stations.py /path/to/NaPTAN910.xml
```

The importer checks population size and all four Cardiff/Heath mappings before writing. Review name/code changes, source checksum/vintage, closures and new openings; run the offline checks and deploy the whole revision. Keep the full XML outside the runtime bundle. NaPTAN is OGL v3; the snapshot includes attribution. No runtime station downloads or station-search MCP tools.

## Tool checklist record

Value: live answers for the two named questions and natural station-name resolution in one MCP call. Manual no-MCP baselines and assistant comparisons are pending; no answer-quality gain is claimed as measured. Risk: low, public station and service information, with no user location tracking. Credentials are server-only and inputs are bounded. Source connectors and MCP definitions are separate; cache/logger/output schemas/HTTP guard reuse existing project patterns. Current MCP specification and linked security guidance were consulted on 22 October 2026; transport revisions are unchanged and tests preserve legacy/current compatibility. Mocked cases cover controlled behaviour; provider filtering, auth, licence presentation and production checks remain release conditions.
