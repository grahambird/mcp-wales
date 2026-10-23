# Milestone 1 acceptance record

Complete this after production deployment. Do not mark ChatGPT as tested based only on MCP Inspector results.

- Date: 11 October 2026
- Git commit: `1bf2fc3cc5329bd2a02535cb2a0c0c99b037feff`
- GitHub repository URL: <https://github.com/grahambird/cardiff-mcp>
- Vercel MCP endpoint: <https://cardiff-mcp.vercel.app/mcp>
- MCP Inspector listed both tools: [ ]
- Equivalent production MCP client listed both tools: [x]
- Production search invocation succeeded: [x]
- Production detail invocation succeeded: [x]
- ChatGPT web showed Add Custom MCP Server: [x]
- ChatGPT discovered exactly `find_food_businesses` and `get_food_business`: [ ]
- Prompt: “Find cafés in Cardiff with a food hygiene rating of 5.”
- Selected establishment name and FHRSID: `200 Degrees Coffee Shop` — `979940` (production MCP smoke test)
- Follow-up prompt: “What is the hygiene rating and inspection date for this Cardiff restaurant?”
- Answer matched the linked FSA record: [ ]
- Answer included an openable FSA source link: [ ]
- Answer avoided claiming that hygiene ratings assess food quality: [ ]
- Notes or remaining issues:

## Waste collection gated-release record

Complete privately before setting `CARDIFF_WASTE_TOOLS_ENABLED=true` in production. Never paste a postcode, address, UPRN, or JWT into this public file.

- Cardiff Council confirmed third-party reuse and attribution: [ ]
- Council response/reference recorded without personal data: [ ]
- `Moved` status meaning confirmed: [ ]
- Private ambiguous-address selection check passed: [x]
- Private selected-property schedule matched the official lookup: [x]
- Communal or unsupported-property behaviour checked: [ ]
- Vercel preview acquired a token and called both endpoints: [ ]
- Preview MCP client discovered and executed both waste tools: [ ]
- No sensitive location data appeared in Vercel logs: [ ]
- Production environment gate enabled: [ ]
- Production MCP smoke test extended and passed: [ ]
- ChatGPT required explicit address selection: [ ]
- ChatGPT described dates as scheduled rather than completed: [ ]
- ChatGPT avoided inferring a reschedule when status was not explicit: [ ]

## School directory release

- Source checked on 11 October 2026; latest register page date: 23 April 2026.
- Imported 126 Cardiff maintained schools; independent schools, PRUs and pupil figures excluded.
- Local lint, type-check, 49 tests, production build and MCP smoke checks passed: [x]
- Vercel preview discovered three default read-only tools: [ ]
- Preview school search returned source URL and publication/import dates: [ ]
- Existing FSA preview smoke checks passed: [ ]
- ChatGPT discovered `find_schools` after refreshing the connection: [ ]
- ChatGPT answered “Find Cardiff High School” using published directory details: [ ]
- ChatGPT searched secondary Welsh-medium schools and preserved transitional labels: [ ]
- ChatGPT cited the register and did not infer pupil figures, distance, catchments or performance: [ ]

Preview and ChatGPT checks remain pending until a preview is deployed and the connection is refreshed. Do not mark them complete based on local tests.

### Production deployment — 11 October 2026

- Deployed the tested working-directory snapshot using Vercel CLI; no Git commit or push was made.
- Deployment: `dpl_97LdrgyAfa2TmAXtyFkzFsMdyNp3`
- Production endpoint: <https://cardiff-mcp.vercel.app/mcp>
- Production build succeeded; deployment is READY.
- Unauthenticated production MCP client discovered `find_food_businesses`, `find_schools`, `get_food_business`: [x]
- School directory shape, Cardiff scope, source dates and attribution passed: [x]
- Existing live FSA search and detail smoke checks passed: [x]
- Live Cardiff High name search and Welsh-medium secondary search passed: [x]
- ChatGPT discovery and presentation remain for the user's live test: [ ]
- Vercel preview checks above were not performed; this was a direct production deployment.

### Custom production domain — 12 October 2026

- Production endpoint: <https://mcp.wales/mcp>.
- Unauthenticated production MCP smoke client discovered all three default read-only tools: [x]
- School directory invariants and live FSA search/detail checks passed: [x]
- Earlier records retain the deployment URLs used for those checks.

## Sorting release — manual ChatGPT checks pending

After deploying and refreshing the ChatGPT connection, start a new conversation:

- “Find the first five Cardiff schools in reverse alphabetical order (Z–A).” Selects `find_schools` with `sort_by=name`, `sort_order=desc`, `limit=5`, `page=1`: [ ]
- “Show me the next five in the same order.” Retains filters, sort and limit, uses `page=2`: [ ]
- “Find the five lowest-rated food businesses in Cardiff.” Selects `find_food_businesses` with `sort_by=rating`, `sort_order=asc`, `limit=5`, `page=1`: [ ]
- “Find the five most recently inspected food businesses in Cardiff.” Explains that inspection-date sorting is unavailable rather than claiming a globally sorted result from one page: [ ]
- Answers preserve sources, school snapshot dates and non-numeric rating distinctions: [ ]

Local deterministic tests establish tool behaviour, not ChatGPT argument selection. These checks remain pending until performed in ChatGPT.

## StatsWales school-profile release

- Independently imported characteristics, year groups and FSM: [x]
- All 126 Cardiff register IDs match each initial snapshot; year-group totals agree: [x]
- Publication 5 August 2026, period 2025/26 and census 20 January 2026 recorded separately: [x]
- Name, governance and school-type differences reviewed and preserved: [x]
- Local lint, type-check, 79 Vitest tests (including six Python importer cases), production build and combined-profile smoke: [x]
- Production discovery includes four default read-only tools: [ ]
- Production profile canary and existing live FSA smoke checks pass: [ ]

Manual ChatGPT acceptance after deployment and connection refresh (not established by automated tests):

- “Tell me about Cardiff High School”: identifies via find_schools, calls get_school, cites register and statistics with reporting/census dates: [ ]
- “Tell me about Ysgol Gyfun Gymraeg Glantaf”: preserves Welsh provision and distinguishes the pupil total from rounded FSM all-pupils count: [ ]
- “How many pupils at Adamsdown Primary are eligible for free school meals?”: distinguishes eligibility from eligibility including transitional protection; reports rounding: [ ]
- Missing or confidential data remains unavailable/suppressed, not estimated or treated as zero: [ ]
- No claims about live enrolment, historical trends, catchments or school quality: [ ]

### Release validation — 12 October 2026

- Reused the existing server on port 3000 at the user's request. All four read-only tools were discovered; dynamic school profile provenance/status checks and live FSA search/detail checks passed.
- The production build passed separately. An isolated smoke server was not started because port 3000 was in use and the user preferred reuse.
- Vercel production deployment was attempted using the existing linked project; CLI returned “Not authorized” and exit code 1. No successful deployment or production acceptance is claimed.
- Production and manual ChatGPT checks remain pending. Source/code changes have not been committed or pushed in this increment.

## Pupil-total discovery release

After automatic deployment from GitHub, refresh the ChatGPT connection and start a new conversation:

- “Which is the largest school in Cardiff by pupil numbers?” invokes find_schools once with sort_by=pupil_total, sort_order=desc, limit=1; cites the census date and qualifies maintained-school coverage: [ ]
- “List the five largest Welsh-medium primary schools in Cardiff.” combines filters and descending pupil sorting with limit=5, without fetching five full profiles: [ ]
- “Show the next five.” retains filters, sort and limit and uses page=2: [ ]
- Incomplete coverage is qualified; suppressed/missing figures are not zero; pupil size is not described as school quality: [ ]

The reported 18-call query is the regression trigger. Deterministic tests establish tool behaviour; the manual checks above remain pending.

## Census release acceptance — pending deployment

- [ ] Verify ONS access from a Vercel preview using Cardiff population and a complete ward ranking.
- [ ] Run the updated smoke client against that preview and production after release.
- [ ] Refresh ChatGPT tool discovery and exercise the eight cases in `scripts/fixtures/census-prompts.json`.
- [ ] Confirm Whitchurch requires code selection, Roath is not silently substituted, and neighbourhood/ward boundaries are explained.
- [ ] Confirm “current population” is not answered as though Census 2021 were current.
- [ ] Compare numerical outputs with the same ONS dataset/version and geography; preserve any disclosure-control differences.

Automated offline checks and local live acceptance are recorded separately when run; they do not establish Vercel-origin access or signed-in ChatGPT behaviour.

### Local census verification — 14 October 2026

- Lint, TypeScript, mocked contracts and production build passed.
- Updated smoke client passed against the existing local server on port 3000, including eight-tool discovery, Cardiff population and complete Welsh-speaking ward ranking, plus existing FSA and school checks.
- Optional live census acceptance passed: Llanishen/Grangetown age comparison, Whitchurch explicit selection and full age bands, Roath non-equivalence, Cardiff/Swansea comparison, MSOA sex and historical-date metadata.
- Independent live ONS TS007 v3 JSON retrieval agreed with returned ward-age counts, denominators and calculated age-65-plus percentages. This checks the same published table; it does not assume agreement with differently tabulated/rounded publications.
- Vercel preview/production and signed-in ChatGPT acceptance remain pending. No deployment was performed.

## Design principles and engineering safeguards — 15 October 2026

- `npm run check`: passed lint, TypeScript, 156 tests in 18 files, five offline maintenance checks and production build.
- `npm run test:smoke`: passed against the local production build with live ONS and FSA, plus bundled schools. The existing client checked discovery of eight read-only tools, bounded FSA search/detail, school search/profile, Census population and a bounded complete-area ranking. No fixed live values were added to assertions.
- Mocked HTTP contracts exercised all eight tools over legacy 2025-03-26 and current 2026-07-28 requests, plus discovery and tool-error paths. Existing input schemas, structured response shapes and text fallbacks are retained.
- New deterministic checks cover request/body limits, supplied-origin validation, FSA cache eviction/expiry/single-flight, outgoing concurrency, queue deadlines, cooldowns, body timeouts, inconsistent pagination/geography, untrusted names, output provenance requirements and diagnostic/secret leakage.
- **Pending:** actual assistant baseline comparisons and tool-selection/interpretation acceptance using [the evaluation guide](docs/ai-evaluations.md). Offline fixture execution does not establish model behaviour or comparative answer gains.
- **Pending:** verify deployed Vercel firewall and hosting log settings. Local smoke success is not Vercel-origin verification of these changes. No deployment or directory submission was performed.


## 22 October 2026 — gated live rail implementation

- Official public Darwin JSON OpenAPI, developer guidance and terms reviewed; see [rail investigation](docs/rail.md).
- User has registered for Rail Data Marketplace; account approval has a reported three-day SLA. No credentials are available locally.
- Two tools are gated by `NATIONAL_RAIL_TOOLS_ENABLED`; existing default discovery remains ten tools.
- Mocked tests cover project-controlled contracts, including intermediate calling-point verification, multiple services, cancellations, already-departed services, delays and London clocks. These do not establish upstream filter semantics.
- Pending: live CDF → HHL multiple intermediate-stop verification, CDF → HLL comparison, approved-product base URL/auth/quotas and attribution presentation, Vercel access, manual assistant baselines/evaluations and deployment. No live rail/ChatGPT/production checks are claimed.
- Final local verification: `npm run check` passed lint, TypeScript, all 230 Vitest tests, six maintenance tests and the production build/runtime bundle check. `git diff --check` passed. Duplicate ignored Next-generated type copies were moved aside locally before the final check; no source configuration change was needed.


## 23 October 2026 — separate rail product configuration

- User supplied Marketplace departure-board and Service Details endpoints and redacted curl examples confirming `x-apikey` for each. User reports both products are free and require credit to “National Rail”. These are user-reported subscription details, not live authentication or full terms verification.
- Connector now requires independently configured Service Details base URL/key instead of sending details requests to the board product. Cache entries include the product base URL. Results credit National Rail and retain the NRE licence acknowledgement.
- Deterministic regression tests cover separate routing/keys, missing or unsafe details configuration and cache isolation across product URLs. `npm run check` passed lint, TypeScript, 237 Vitest tests, six maintenance tests, production build and runtime-bundle checks. `git diff --check` passed.
- Live credentials, intermediate-stop filtering, production access, full terms/quotas/branding and assistant comparisons remain pending. No deployment or live authenticated rail checks were performed.


## 23 October 2026 — first authenticated local rail attempt

- Added the supplied product base URLs and local rail enable flag to ignored `.env.local`, preserving existing secrets. Checked only key presence/format flags; no secret values were displayed.
- Started the local MCP server on loopback port 3001 and ran `scripts/test-rail-client.mjs`. Its first HHL departure-board request reached the provider and returned HTTP 401; the smoke script failed on the execution error. Stopped without further provider requests. Service Details authentication and all live data/filtering checks remain unverified.
- Both local rail key settings are present without whitespace or obvious placeholder prefixes. User needs to verify each subscription's Consumer Key and active status; the cause of the 401 is not established. No deployment performed.
- Next.js emitted a security upgrade recommendation during startup; no dependency changes were made in this rail check.


## 23 October 2026 — local live rail contracts passed

- After the user corrected the departure-board Consumer Key, the initial request returned HTTP 400. Two bounded direct checks isolated the cause: literal `filterCrs=null` returned 400, while omitting optional filtering returned HTTP 200. Updated the connector to omit `filterCrs`/`filterType` without a destination, and updated the deterministic regression assertion.
- The local MCP smoke client then passed all four cases: HHL by full name (five results), HHL by CRS (five), CDF → HHL (four), and CDF → HLL (three). Both independently configured API subscriptions authenticated successfully. Counts are dated observations, not persistent assertions. Successful destination results require matching subsequent calling points, establishing multiple intermediate-stop results for this live sample.
- `npm run check` passed lint, TypeScript, 237 Vitest tests, six maintenance tests, production build and runtime-bundle checks; `git diff --check` passed. Live responses were not saved to disk.
- Independent comparison of arrivals, final destinations and both HHL directions against the official National Rail boards remains pending, as do Vercel-origin access, full subscription terms/quotas/branding, assistant evaluations and deployment. Local success does not establish production acceptance.


## 23 October 2026 — user comparison with National Rail boards

- User compared the displayed local MCP results retrieved at 19:15:44–45 BST with the National Rail boards and reported “That all looks good”, with roughly one-minute differences in revised departure predictions for delayed trains. This is user-reported manual acceptance, not an independent agent browser comparison or a synchronized feed audit.
- The displayed comparison covered HHL departures in both directions, CDF → HHL and CDF → HLL, including an explicitly cancelled service, delayed services, intermediate arrivals and final destinations. Accepted for this sample; the cause of the small prediction differences was not independently established.
- Vercel-origin access, full subscription terms/quotas/branding review, assistant comparisons and production deployment remain pending.


## 23 October 2026 — Vercel Preview rail acceptance

- User reports subscription wording “Fair usage limit: No”. Recorded as no stated fair-use limit, not a guarantee of unlimited capacity; connector safeguards remain unchanged.
- Deployed the current rail checkout to Preview: https://mcp-wales-h5scpz1r4-grahambirds-projects.vercel.app (deployment `dpl_6zbPnQti1saKymSikebUhRNZb7LK`). Vercel reported READY. This deployment includes the local uncommitted rail fixes; it is not identified solely by the branch's HEAD commit. Production was not deployed or promoted.
- Deployment protection remains enabled. Used authenticated `vercel curl` requests for MCP initialization, tools/list and four bounded live tool calls. Initialization succeeded; discovery exposed exactly 12 tools including both rail tools.
- Vercel-origin live calls passed: HHL by name and CRS (five services each), CDF → HHL (four), CDF → HLL (three). Verified requested station/destination, result bounds, status values, National Rail attribution and null departure predictions for cancellations where present. Both provider subscriptions worked from Vercel. Counts are dated observations, not canary assertions.
- No keys or raw live responses were persisted in this acceptance record. Full terms/branding review, assistant comparisons, Vercel provider-failure acceptance, production activation/canary changes and production checks remain pending. Next.js security warning remains unresolved; no dependency upgrade was performed.


## 22 October 2026 — discovery instructions and tool annotations

- Before editing, read production `initialize` and `tools/list` at `https://mcp.wales/mcp`: ten tools, the recently revised school descriptions, the original long server instructions and `openWorldHint=true` on every tool. These were successful read-only metadata requests, not ChatGPT selection tests.
- Local changes introduce datasets and the reported school/year-group and Welsh-speaking ranking workflows in the first 512 characters. Snapshot-only tools declare `openWorldHint=false`; live-capable tools remain open-world. All tools remain explicitly read-only/non-destructive. Waste guidance is included only when the existing gate is enabled.
- Exact reported prompts are added to the reusable fixtures; automated contracts and the school discovery/profile workflow do not establish model tool selection.
- Pending: deployment of this revision, production verification of the updated instructions/annotations, refresh of the ChatGPT connection and fresh-chat retests of both reported prompts with actual client/model and results recorded. No improvement in actual selection is claimed yet.
- Local verification passed: `npm run check` (lint, TypeScript, 182 Vitest tests, six maintenance tests, production build and runtime-bundle check) and `git diff --check`. The separate local rail branch remains at `f5a7176`; the earlier acceptance-checkbox edit is preserved.


## 23 October 2026 — production rail release preparation

- User agreed to defer separate assistant Preview testing because this is a single-user service; actual rail tool selection/interpretation remains unverified until tested via the existing production connection.
- Upgraded Next.js from 16.4.0 to 16.4.3 after npm audit identified advisories affecting 16.4.0. Installation audit reported zero known vulnerabilities.
- Integrated main's newer school descriptions, discovery instructions and snapshot annotations, preserving gated rail registration and adding gated rail guidance to the current instructions. Preserved both branches' acceptance history and tests. Restored the user's previously saved acceptance-checkbox edit; its named Git stash remains available.
- Updated the daily production workflow to expect the two enabled rail tools and run bounded rail contracts, without fixed train names, IDs, counts, platforms or times.
- Full merged checks passed: lint, TypeScript, 239 Vitest tests, six maintenance tests, Next.js 16.4.3 production build and runtime-bundle checks. Production deployment and post-deployment results will be recorded separately.


## 23 October 2026 — production rail enabled and checked

- Published tested release `1b91aba5865e864a1e99f055982ea0cbc95071c8` to main. Vercel's Git integration deployed it to Production as `dpl_64oe8UFDUMaZXweAxekGteMcvyJp`, URL https://mcp-wales-8eqno019d-grahambirds-projects.vercel.app, READY and aliased to https://mcp.wales. Set `NATIONAL_RAIL_TOOLS_ENABLED=true` for Production before deployment; existing rail credentials stayed server-only.
- Ran `NATIONAL_RAIL_TOOLS_ENABLED=true npm run smoke:client -- https://mcp.wales`: passed production discovery of all 12 tools and existing FSA, school, Census and ward-summary checks.
- Ran `node scripts/test-rail-client.mjs https://mcp.wales`: passed HHL full-name and CRS departures (five services each), CDF → HHL (four) and CDF → HLL (three). Counts are dated observations only. This establishes production-origin provider access, not actual assistant selection or interpretation.
- The user explicitly chose to defer separate assistant Preview setup and test through the existing production connection. Actual assistant testing remains pending. Full independent subscription terms/branding audit, live provider-failure exercises and hosting log/firewall configuration review were not performed.
- Release includes Next.js 16.4.3, zero known vulnerabilities reported by installation audit, the latest main discovery improvements, and the updated daily rail-aware canary. `git diff --check` passed for the release documentation update.
