# Data source register

## Food Standards Agency food hygiene ratings

| Field | Detail |
| --- | --- |
| Publisher | Food Standards Agency (FSA) |
| Dataset | Food Hygiene Rating Scheme (FHRS) data |
| API | `https://api.ratings.food.gov.uk`, version 2 |
| Documentation | <https://api.ratings.food.gov.uk/help> |
| Dataset page | <https://data.food.gov.uk/catalog/datasets/38dd8d6a-5ab1-4f50-b753-ab33288e3200> |
| Terms | <https://ratings.food.gov.uk/terms-and-conditions> |
| Licence | Open Government Licence v3.0 |
| Update pattern | Live API data is updated as local authorities upload and publish records |

Requests use these headers:

```text
x-api-version: 2
Accept: application/json
Accept-Language: en-GB
```

No registration, login, or API key is currently required.

### Cardiff scope

The current FSA authority listing identifies Cardiff as:

- `LocalAuthorityId`: `339` — used by the API search filter;
- `LocalAuthorityIdCode`: `556` — used when verifying detail records;
- name: `Cardiff`;
- scheme: FHRS.

These are identifiers in the FSA system and must not be described as ONS area codes. The connector fixes every search to authority ID 339. A direct establishment lookup is returned only when its authority code or authority name confirms Cardiff.

### Interpretation and freshness

Ratings describe hygiene standards found at the inspection date. They are not reviews of food quality and do not contain menus, opening hours, bookings, or availability. Ratings can change. Results therefore include the inspection date, the FSA extract time when the endpoint supplies it, the retrieval time, and a canonical FSA business link.

The API sometimes supplies `1901-01-01` when no meaningful rating date exists. MCP Wales returns `null` instead. Numeric values `0` to `5` remain numbers; `AwaitingInspection`, `AwaitingPublication`, `Exempt`, unknown text, and `NewRatingPending` remain explicit states rather than being converted into scores.

### Attribution and branding

Every tool result and relevant project documentation includes:

> Contains public sector information licensed under the Open Government Licence v3.0. Source: Food Standards Agency.

The project does not use FSA logos or official rating badge imagery. It does not imply endorsement by the FSA. FSA imagery has additional trademark and usage rules separate from the dataset's OGL terms.

## Cardiff Council waste collections — gated spike

| Field | Detail |
| --- | --- |
| Publisher | Cardiff Council |
| Official lookup | <https://www.cardiff.gov.uk/article/2115/When-are-my-bins-collected> |
| Collection updates | <https://www.cardiff.gov.uk/collectionupdates> |
| Access method | Undocumented council-operated SOAP token service and JSON address/collection endpoints used by the official web experience |
| Authentication | Short-lived bearer token issued without a resident account; no project secret |
| Verification date | 11 October 2026 |
| Licence and attribution | Not identified; clarification required before production release |
| Published limits | None found |
| Freshness metadata | None supplied in the checked response |

Bounded checks confirmed token acquisition, HTTP 204 for both an invalid address search and a synthetic unknown UPRN, and two weeks of collection data for a community connector's published test UPRN. Observed source labels were `Garden`, `Food`, `Recycling`, `General`, and `Glass`; new labels are preserved rather than rejected. `collectionType` was `Standard` in the live sample. Historical community code maps `Moved` to a rescheduled collection, but that meaning still requires confirmation from Cardiff Council.

The community connectors are MIT-licensed, but their code licences do not license Cardiff Council's data. The implementation is therefore disabled by default. It neither downloads a city-wide address dataset nor performs arbitrary address searches. User-supplied postcodes, addresses, UPRNs and access tokens must not be persisted or logged.

Retrieval time records when MCP Wales fetched a response. It is not the publisher's update time. Scheduled dates are not confirmation that collection occurred, missing data is not proof that no service exists, and future dates must not be calculated from an assumed pattern.

## Welsh Government school register — Cardiff maintained schools

| Field | Detail |
| --- | --- |
| Publisher | Welsh Government |
| Official register | <https://www.gov.wales/addresses-and-phone-numbers-schools-and-pupil-referral-units> |
| Download checked | <https://www.gov.wales/sites/default/files/publications/2026-04/address-list-schools-values.ods> |
| Publication date | 23 April 2026; no newer release shown when checked on 11 October 2026 |
| Import date | 11 October 2026; exact timestamp and source SHA-256 recorded in `src/schools/directory.json` |
| Licence | Workbook N2 explicitly states OGL v3.0 except where otherwise stated; <https://www.gov.wales/copyright-statement> |
| Coverage | 126 Cardiff maintained schools from the English `Maintained` sheet, LA education code `681` |
| Update frequency | Directory schedule unconfirmed; updates are manual |

School numbers are seven-digit strings, separate from FSA authority identifiers and ONS geography codes. The import retains source names, sectors, types, governance, language categories, addresses, postcodes and telephone numbers. It excludes independent schools, PRUs and pupil counts. Register pupil counts do not have a sufficiently clear reporting period for this release.

Welsh-medium and dual-language groups include transitional provision; original labels are retained. Unknown future labels map to `unknown`, never to an inferred language based on school name. A missing school or a changed identifier does not prove closure. No historical identity mapping is supplied.

Every result includes the register URL, its publication date, the snapshot import time and:

> Contains public sector information licensed under the Open Government Licence v3.0. Source: Welsh Government.

Import time is not the publisher's update time. The data is a snapshot, not a guarantee of current contacts or availability. No logos or endorsement claims are used.

### Manual refresh

Follow the [school-register procedure](docs/OPERATIONS.md#school-register) in the maintenance runbook, including rebuilding geography associations before the final checks.

## FSA sorting capability — checked 12 October 2026

The live API v2 `/SortOptions` lookup confirms name A–Z (`alpha`), name Z–A (`desc_alpha`), rating highest first (`rating`) and rating lowest first (`desc_rating`). These rating keys are counterintuitive and must be mapped explicitly. The lookup also provides relevance and distance; these are not exposed in this change. No inspection-date option is supplied.

The connector sends the chosen sort with existing filters and bounded pagination in one request. It preserves returned ordering without sorting individual pages or downloading all matches. FSA does not document a secondary tie-breaker or guarantee an unchanged dataset between page requests. Non-numeric rating placement is upstream-controlled.

## StatsWales school statistics

Three independent Cardiff-only snapshots are stored under `src/schools/statswales/`; the register is never rewritten by this import. The provider is Welsh Government, publishing service StatsWales, source PLASC. Supported API documentation: <https://api.stats.gov.wales/docs/?urls.primaryName=API+v2+%28English%29>.

| Import kind | Dataset ID | Measures |
| --- | --- | --- |
| characteristics | 2018f447-f4c0-438d-bb88-2a72af967724 | Pupil headcount and census characteristics |
| year_groups | 9b0d8f7a-02f9-4663-8093-ec975074f4ea | Pupil headcounts by published year group |
| fsm | 996385d1-061e-4835-8c92-60d232277216 | Eligibility and eligibility including transitional protection; counts, percentages, all-pupils count |

Initial import: 12 October 2026. All three exports cover 2025/26, census 20 January 2026, published 5 August 2026; next update expected August 2027. Each matches all 126 register schools, with no unmatched Cardiff IDs. Year groups sum to the characteristics total for every Cardiff school. Pupil totals include published nursery and post-16 groups and are headcounts, not FTE or capacity. The characteristics dataset history records removal of subsidiary pupils on 29 January 2026.

FSM counts round to the nearest five; percentages are supplied separately and must not be recalculated. Thus Glantaf has a pupil total of 1,528 and an FSM all-pupils count of 1,530. Means-tested eligibility and eligibility including transitional protection are separate categories; neither includes meals received solely through universal primary provision. CSV exports represent suppression as a blank value with a Confidential note. No Cardiff values were suppressed in this import; suppression exists elsewhere in the public dataset and is covered by tests. Blank values without notes are unavailable, never zero.

Register and census characteristics differ, including governance at some schools and the name THE COURT SCHOOL versus Ysgol Cynefin (6817005). These differences are retained, not resolved by assumptions. Original source names are stored separately; joins use seven-digit identifiers only. The year-group Welsh metadata title is stale (2024/25); the importer checks the English title and explicitly supplied reporting period. Historical comparisons are deferred because the documented API exposes latest revisions, without an established historical revision-download route.

Reuse follows OGL v3 through the dataset pages' linked <https://www.gov.wales/copyright-statement>. Every profile includes source URLs and: “Contains public sector information licensed under the Open Government Licence v3.0. Source: Welsh Government (StatsWales).” No logos or endorsement are used.

### Independent manual refresh

Follow the [StatsWales procedure](docs/OPERATIONS.md#statswales-school-statistics) in the maintenance runbook. Each statistics snapshot can be updated independently.

Supported CSV downloads stream the complete, modest national dataset once during manual refresh (currently about 1,441, 11,972 and 7,205 rows respectively), then bundle only Cardiff rows. This is a documented bulk export, not exhaustive runtime search. API v2 also supports filtered and paginated JSON and sorting, but runtime requests are unnecessary for this snapshot design. No new source-specific numerical usage limit was established; keep acquisition sequential and stop on upstream errors.

## ONS Census 2021

| Dataset | Pinned published version | Use |
| --- | --- | --- |
| TS001 | 3 | Usual residents in households and communal establishments |
| TS007 | 3 | Single-year ages; derived summary and five-year bands |
| TS008 | 4 | Sex |
| TS033 | 3 | Welsh-speaking ability; denominator is residents aged 3+ |

Metadata latest-version links and live Cardiff requests were verified on 14 October 2026. TS007A was not found at its API dataset endpoint; this integration uses TS007, not a local download or a substituted provider. Pinned definitions are in `src/ons/datasets.ts`. During release verification, read each `/datasets/{ID}` metadata response and compare `links.latest_version` with the registry. Review category/population-definition changes and rerun acceptance before updating a pin; never silently adopt a new version.

API: `https://api.beta.ons.gov.uk/v1`. Observations use GET `/datasets/{ID}/editions/2021/versions/{version}/json?area-type={ltla|wd|msoa},{explicit codes}`. Documentation: <https://developer.ons.gov.uk/censusobservations/>. No authentication or API key. Queries always specify supported codes. Parent filters are not relied on, because attempted filters were rejected or ignored during investigation. All 28 Cardiff wards were returned together for TS001, TS007 and TS033. No upstream sorting is assumed. The connector checks returned codes and completeness, then calculates and sorts locally. MSOA and local-authority comparisons use the same normalizer.

Statistics are as at 21 March 2021. ONS wards use May 2022 boundaries. Census disclosure control adds small perturbations: topic totals can differ, and sums of areas need not equal the separately tabulated authority total. Cardiff TS001 in the checked response summed to 362,308, whereas TS008 summed to 362,310; these are table-specific estimates, not a calculation defect or today’s population. Percentages use the selected table’s categories and population base. “65+” includes age 65 and the 100+ category. TS033 excludes category -8 from its eligible denominator. See <https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates/methodologies/protectingpersonaldataincensus2021results>.

### Geography catalogue and extension

The shared geography catalogue now supplies runtime Census resolution through a compatibility adapter, preserving 22 Welsh authorities, 28 Cardiff wards and 48 Cardiff MSOAs. `src/ons/geographies.json` is a historical seed only; its old refresh command no longer writes a competing catalogue. Follow [shared geography refresh procedures](docs/geography.md). Internal LSOA coverage does not add LSOAs to Census tools.

Ward membership comes from the direct ONS May 2022 ward-to-authority workbook, ArcGIS item `96172380bb7d429bac154d03bf35a651`; its full list is used rather than inferred code ranges. Welsh ward aliases come from the ONS geography lookup service. MSOA membership uses ONS’s published Cardiff-prefixed official MSOA names; the response has 48 entries and is validated. Local-authority identifiers come from the ONS ltla listing. Cardiff/Caerdydd and Swansea/Abertawe aliases are included; Welsh aliases are not comprehensive across all authorities. Sources and retrieval time are recorded in the catalogue.

To add another authority’s subdivisions: extend the refresh script’s explicit authority coverage, retrieve matching official ward and MSOA membership for the same boundary vintages, validate the lists against ONS, update resolver coverage and ranking scope, and add contract/completeness tests and live acceptance. Do not derive ward population by summing best-fit LSOAs. Neighbourhood aliases require authoritative boundary evidence; approximate or partial names must require explicit official-code selection. LSOA support requires a separate reviewed catalogue and bounds update.

### Attribution, storage and operations

Source: Office for National Statistics licensed under the Open Government Licence v.3.0.

ONS observations and non-postcode lookup products use OGL v3: <https://www.ons.gov.uk/methodology/geography/licences>. The Census observation connector uses no logos, boundary geometry, postcode or UPRN data. The separate shared geography capability uses licensed boundaries and a Cardiff postcode subset as documented below. Observations are never written to disk or a persistent store; synthetic test fixtures are not a demographic dataset. Successful validated live responses are cached in memory for five minutes, at most 100 entries per warm instance.

ONS documents 120 requests/10 seconds, 200/minute, and 15/10 seconds for high-demand assets, subject to change: <https://developer.ons.gov.uk/bots/>. Honour Retry-After. Local safeguards are deliberately more conservative but cannot enforce a deployment-wide budget. Node/Vercel access must be checked separately: curl worked locally; another HTTP client received 403. Neither availability nor an undocumented production observation-size limit is assumed.

## Monthly freshness review

The monthly workflow detects source changes without importing or deploying them. See [scheduled checks and freshness review](docs/OPERATIONS.md#scheduled-checks-and-freshness-review) for commands, outcomes and follow-up.

## Shared geography and FSA ward snapshots

See [architecture, source products, licences and refresh/rebuild commands](docs/geography.md). References use May 2022 wards, 2021 LSOAs/MSOAs, and the August 2026 ONSPD postcode edition; latest postcode ward fields are not substituted for 2022 wards. Exact statistical nesting, published best-fit allocation and spatial intersection remain distinct. Machine-readable product identities, available publication dates, portal metadata dates, checksums and attribution are recorded in `src/geography/data/W06000015/catalogue.json`.

The official [Welsh Government May 2022 ward geometry](https://datamap.gov.wales/layers/geonode:electoral_wards_wales_may_2022) is derived from OS Boundary-Line, created 4 July 2022, OGL v3, with its 2022 OS copyright notice. ONS boundary products and postcode products are OGL subject to the [ONS/OS/Royal Mail attribution notices](https://www.ons.gov.uk/methodology/geography/licences). Only Cardiff postcode records are retained; no commercial postcode-to-address service, Northern Ireland data or public postcode tool is involved. Postcode assignment of establishments is approximate. Terminated or unreliable postcodes are not current location evidence.

`src/fsa/source.json` is a source-only snapshot of the complete official Cardiff XML download; associations are stored separately. FSA [recommends authority Open Data downloads for complete updates](https://api.ratings.food.gov.uk/Help/BestPractices). Initial acquisition: 15 October 2026; extract date 13 October 2026; 3,492 records; SHA-256 and exact retrieval time are in the snapshot. Manual refreshes validate the official listing count against the XML header and parsed population. Ward discovery and aggregates use this dated population; existing unfiltered discovery and individual details remain live with existing API protections. Source fields are retained; geography does not rewrite them.

Current source, reference and association versions are tied together by a release manifest checked on every production build. Reference updates can re-enrich retained source snapshots without downloading them again; unchanged locations keep existing valid associations across source-only updates. Review ONSPD quarterly, metadata/corrections monthly, and FSA snapshots manually as needed; responses warn after 30 days. No reference vintage is advanced automatically because it must remain compatible with Census.
