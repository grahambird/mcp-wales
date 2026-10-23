import railPrompts from "../../scripts/fixtures/rail-prompts.json";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { clearRailStateForTests, getRailDetail } from "./client";
import { resolveStation, StationError } from "./stations";
import { railTime } from "./time";
import { runLiveDepartures, runNextTrains } from "@/mcp/rail-tools";
import { outputSchemas } from "@/mcp/output-schemas";

const generatedAt = "2026-10-22T12:00:00Z"; // 13:00 BST
const destination = [{ locationName: "Rhymney", crs: "RHY" }];
function service(id = "one", changes: object = {}) {
  return { serviceID: id, std: "13:05", etd: "On time", destination, serviceType: "train", subsequentCallingPoints: [{ serviceType: "train", serviceChangeRequired: false, callingPoint: [{ locationName: "Heath High Level", crs: "HHL", st: "13:17", et: "13:20" }] }], ...changes };
}
function mockBoard(services: object[] | null = [service()], changes: object = {}) {
  const fetcher = vi.fn(async (url: string) => {
    if (url.includes("GetServiceDetails")) return Response.json({ crs: "CDF" });
    return Response.json({ generatedAt, crs: "CDF", trainServices: services, ...changes });
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}
const next = (extra: object = {}) => runNextTrains({ from_station: "Cardiff Central", to_station: "Heath High Level", ...extra });
function result(value: Awaited<ReturnType<typeof next>>) {
  expect(value).not.toHaveProperty("isError");
  return outputSchemas.get_next_trains.parse(value.structuredContent) as { result: import("zod").infer<typeof import("./schemas").railResultSchema> };
}
beforeEach(() => {
  clearRailStateForTests();
  vi.stubEnv("NATIONAL_RAIL_API_KEY", "test-secret-do-not-leak");
  vi.stubEnv("NATIONAL_RAIL_API_BASE_URL", "https://api1.raildata.org.uk/test-product/LDBWS/api/20220120");
  vi.stubEnv("NATIONAL_RAIL_SERVICE_DETAILS_API_KEY", "detail-secret-do-not-leak");
  vi.stubEnv("NATIONAL_RAIL_SERVICE_DETAILS_API_BASE_URL", "https://api1.raildata.org.uk/1010-service-details1_2/LDBWS/api/20220120");
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("shared station reference", () => {
  it.each([["Heath High Level", "HHL"], ["Heath (High Level)", "HHL"], ["hhl", "HHL"], ["Heath Low Level", "HLL"], ["Cardiff Central", "CDF"], ["cardiff queen street", "CDQ"]])("resolves %s", (name, crs) => expect(resolveStation(name).crs).toBe(crs));
  it("does not guess an ambiguous name or silently accept a unique partial name", () => {
    expect(() => resolveStation("Heath")).toThrow(StationError);
    try { resolveStation("Heath"); } catch (error) { expect((error as StationError).candidates.map(s => s.crs)).toEqual(expect.arrayContaining(["HHL", "HLL"])); }
    expect(() => resolveStation("Cardiff Cent")).toThrow(StationError);
  });
  it("detects normalized collisions", () => expect(() => resolveStation("test", [{ name: "Test", crs: "AAA" }, { name: "Test", crs: "BBB" }])).toThrow(StationError));
  it("reports unknown stations before making network requests", async () => {
    const fetcher = mockBoard();
    expect((await runLiveDepartures({ station: "imaginary railway" })).structuredContent).toMatchObject({ error: "unknown_station" });
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("Darwin tools", () => {
  it("returns multiple direct services to intermediate HHL with separate final destinations", async () => {
    const fetcher = mockBoard([service(), service("two", { std: "13:20" })]);
    const { result: value } = result(await next());
    expect(value.services).toHaveLength(2);
    expect(value.destination).toEqual({ name: "Heath High Level", crs: "HHL" });
    expect(value.services[0]).toMatchObject({ final_destinations: [{ name: "Rhymney", crs: "RHY" }], platform: null, scheduled_arrival: "2026-10-22T12:17:00.000Z", expected_arrival: "2026-10-22T12:20:00.000Z", departure_information: "live" });
    expect(fetcher.mock.calls[0][0]).toContain("filterCrs=HHL");
  });
  it("never substitutes direction, final destination or a connecting service for a confirmed stop", async () => {
    mockBoard([service("missing", { subsequentCallingPoints: [] }), service("change", { subsequentCallingPoints: [{ serviceChangeRequired: true, callingPoint: [{ locationName: "Heath High Level", crs: "HHL" }] }] })]);
    expect(result(await next()).result.services).toEqual([]);
  });
  it("does not confuse HLL with HHL", async () => {
    const fetcher = mockBoard();
    expect(result(await next({ to_station: "Heath Low Level" })).result.services).toEqual([]);
    expect(fetcher.mock.calls[0][0]).toContain("filterCrs=HLL");
  });
  it("returns both directions without a destination filter", async () => {
    const fetcher = mockBoard([service(), service("other", { destination: [{ locationName: "Barry Island", crs: "BYI" }] })]);
    const call = await runLiveDepartures({ station: "CDF" });
    expect(result(call).result.services).toHaveLength(2);
    const query = new URL(fetcher.mock.calls[0][0]).searchParams;
    expect(query.has("filterCrs")).toBe(false);
    expect(query.has("filterType")).toBe(false);
  });
  it("includes overdue delayed services and sorts by predictions before applying limit", async () => {
    mockBoard([service("late", { std: "12:50", etd: "13:20" }), service("next", { std: "13:05" })]);
    const values = result(await next()).result.services;
    expect(values.map(s => s.status)).toEqual(["on_time", "delayed"]);
    expect(values[1].delay_minutes).toBe(30);
    expect(result(await next({ limit: 1 })).result.services[0].scheduled_departure).toBe("2026-10-22T12:05:00.000Z");
  });
  it("excludes confirmed actual departures but retains an overdue unknown prediction", async () => {
    const fetcher = mockBoard([service("gone"), service("unknown", { std: "12:59", etd: "No report" })]);
    fetcher.mockImplementation(async url => url.includes("GetServiceDetails/gone") ? Response.json({ crs: "CDF", atd: "13:01" }) : url.includes("GetServiceDetails") ? Response.json({ crs: "CDF" }) : Response.json({ generatedAt, crs: "CDF", trainServices: [service("gone"), service("unknown", { std: "12:59", etd: "No report" })] }));
    const values = result(await next()).result.services;
    expect(values).toHaveLength(1);
    expect(values[0]).toMatchObject({ status: "unknown", expected_departure: null, delay_minutes: null });
  });
  it.each([
    { isCancelled: true },
    { etd: "Cancelled" },
    { filterLocationCancelled: true },
    { subsequentCallingPoints: [{ callingPoint: [{ locationName: "Heath High Level", crs: "HHL", isCancelled: true }] }] },
    { subsequentCallingPoints: [{ assocIsCancelled: true, callingPoint: [{ locationName: "Heath High Level", crs: "HHL" }] }] },
  ])("preserves cancellation without a usable prediction: %j", async changes => {
    mockBoard([service("cancelled", changes), service("viable", { std: "13:10" })]);
    const values = result(await next()).result.services;
    expect(values.find(s => s.status === "cancelled")).toMatchObject({ expected_departure: null, expected_arrival: null, delay_minutes: null });
    expect(values.some(s => s.status === "on_time")).toBe(true);
  });
  it("returns explicit no-services without claiming the last train has departed", async () => {
    mockBoard(null);
    expect(result(await next()).result).toMatchObject({ services: [], status: "no_services", explanation: expect.stringContaining("does not establish") });
  });
  it("distinguishes suppressed boards", async () => {
    mockBoard([], { areServicesAvailable: false });
    expect(result(await next()).result.status).toBe("services_unavailable");
  });
  it("preserves timetable-only and missing platform values", async () => {
    mockBoard([service("one", { etd: null, platform: "5" })], { platformAvailable: false });
    expect(result(await next()).result.services[0]).toMatchObject({ departure_information: "timetable_only", expected_departure: null, platform: null, status: "unknown" });
  });
  it("validates input and distinct stations before network access", async () => {
    const fetcher = mockBoard();
    for (const limit of [0, 11, 1.2]) expect((await next({ limit })).structuredContent).toMatchObject({ error: "invalid_input" });
    expect((await next({ to_station: "CDF" })).structuredContent).toMatchObject({ error: "invalid_input" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("reports missing credentials and unsafe configured hosts as unavailable", async () => {
    const fetcher = mockBoard();
    vi.stubEnv("NATIONAL_RAIL_API_KEY", "");
    expect((await next()).structuredContent).toMatchObject({ error: "unavailable" });
    vi.stubEnv("NATIONAL_RAIL_API_KEY", "secret"); vi.stubEnv("NATIONAL_RAIL_API_BASE_URL", "https://attacker.invalid/LDBWS");
    expect((await next()).structuredContent).toMatchObject({ error: "unavailable" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("retries one server failure, then reports unavailable rather than an empty board", async () => {
    const fetcher = vi.fn(async () => new Response("test-secret-do-not-leak", { status: 503 })); vi.stubGlobal("fetch", fetcher);
    const call = await next();
    expect(call).toMatchObject({ isError: true, structuredContent: { error: "unavailable" } });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(call)).not.toContain("test-secret-do-not-leak");
    expect(JSON.stringify(vi.mocked(console.info).mock.calls)).not.toContain("test-secret-do-not-leak");
  });
  it("honours Retry-After without retries during cooldown", async () => {
    const fetcher = vi.fn(async () => new Response("", { status: 429, headers: { "retry-after": "60" } })); vi.stubGlobal("fetch", fetcher);
    expect((await next()).structuredContent).toMatchObject({ error: "unavailable" });
    expect((await next()).structuredContent).toMatchObject({ error: "unavailable" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it.each([{}, null, { crs: "CDF", generatedAt, trainServices: [{ serviceID: "bad" }] }])("rejects malformed successful responses: %j", async body => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(body)));
    expect((await next()).structuredContent).toMatchObject({ error: "unavailable" });
  });
  it("rejects oversized streamed responses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("x".repeat(256 * 1024 + 1))));
    expect((await next()).structuredContent).toMatchObject({ error: "unavailable" });
  });
  it("rejects station mismatches and expired service details", async () => {
    mockBoard([service()], { crs: "HHL" });
    expect((await next()).structuredContent).toMatchObject({ error: "unavailable" });
    clearRailStateForTests();
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.includes("GetServiceDetails") ? Response.json(null) : Response.json({ generatedAt, crs: "CDF", trainServices: [service()] })));
    expect((await next()).structuredContent).toMatchObject({ error: "unavailable" });
  });
  it("deduplicates duplicate queries and expires the cache after 15 seconds", async () => {
    const fetcher = mockBoard();
    await Promise.all([next(), next()]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    const now = Date.now(); const spy = vi.spyOn(Date, "now").mockReturnValue(now + 15001);
    await next(); expect(fetcher).toHaveBeenCalledTimes(4); spy.mockRestore();
  });
});
describe("London clock handling", () => {
  it.each([
    ["13:05", generatedAt, "2026-10-22T12:05:00.000Z"],
    ["13:05", "2026-12-22T13:00:00Z", "2026-12-22T13:05:00.000Z"],
    ["00:05", "2026-10-22T22:58:00Z", "2026-10-22T23:05:00.000Z"],
    ["01:30", "2026-10-25T00:00:00Z", null],
    ["01:30", "2026-03-29T00:30:00Z", null],
    ["13:05*", generatedAt, null],
    ["Delayed", generatedAt, null],
  ])("resolves %s against %s", (time, reference, expected) => expect(railTime(time, reference)).toBe(expected));
});

it("surfaces request timeouts with bounded retry and no provider exception leakage", async () => {
  const fetcher = vi.fn(async () => { throw new DOMException("test-secret-do-not-leak", "TimeoutError"); });
  vi.stubGlobal("fetch", fetcher);
  expect(await next()).toMatchObject({ isError: true, structuredContent: { error: "unavailable" } });
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("bounds concurrent detail requests to two and never exposes credentials in the URL", async () => {
  let active = 0; let maximum = 0;
  const fetcher = vi.fn(async (url: string, options: RequestInit) => {
    expect(url).not.toContain("test-secret-do-not-leak");
    expect(url).not.toContain("detail-secret-do-not-leak");
    expect(options.headers).toMatchObject({ "x-apikey": url.includes("GetServiceDetails") ? "detail-secret-do-not-leak" : "test-secret-do-not-leak" });
    expect(options.redirect).toBe("error");
    if (!url.includes("GetServiceDetails")) return Response.json({ generatedAt, crs: "CDF", trainServices: Array.from({ length: 10 }, (_, i) => service(String(i))) });
    active++; maximum = Math.max(maximum, active);
    await new Promise(resolve => setTimeout(resolve, 1)); active--;
    return Response.json({ crs: "CDF" });
  });
  vi.stubGlobal("fetch", fetcher);
  expect(result(await next({ limit: 10 })).result.services).toHaveLength(10);
  expect(maximum).toBe(2);
  expect(fetcher).toHaveBeenCalledTimes(11);
});

// Supplied expected arguments exercise contracts, not actual model tool selection.
it.each(railPrompts)("executes the expected prompt contract: $prompt", async fixture => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const crs = fixture.arguments.station === "Heath Low Level" ? "HLL" : fixture.tool === "get_live_departures" ? "HHL" : "CDF";
    return Response.json(url.includes("GetServiceDetails") ? { crs } : { generatedAt, crs, trainServices: [service()] });
  }));
  const call = fixture.tool === "get_live_departures"
    ? await runLiveDepartures({ station: fixture.arguments.station! })
    : await runNextTrains({ from_station: fixture.arguments.from_station!, to_station: fixture.arguments.to_station! });
  if (fixture.arguments.station === "imaginary station") expect(call.structuredContent).toMatchObject({ error: "unknown_station" });
  else expect(result(call).result.origin.crs).toBe(fixture.tool === "get_next_trains" ? "CDF" : fixture.arguments.station === "Heath Low Level" ? "HLL" : "HHL");
});


describe("separate Marketplace products", () => {
  it("routes each operation with only its subscription key", async () => {
    const fetcher = mockBoard();
    result(await next());
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      expect.stringContaining("https://api1.raildata.org.uk/test-product/LDBWS/api/20220120/GetDepBoardWithDetails/CDF?"),
      "https://api1.raildata.org.uk/1010-service-details1_2/LDBWS/api/20220120/GetServiceDetails/one",
    ]);
  });
  it.each([
    ["NATIONAL_RAIL_SERVICE_DETAILS_API_KEY", ""],
    ["NATIONAL_RAIL_SERVICE_DETAILS_API_BASE_URL", ""],
    ["NATIONAL_RAIL_SERVICE_DETAILS_API_BASE_URL", "https://attacker.invalid/product/LDBWS/api/20220120"],
    ["NATIONAL_RAIL_SERVICE_DETAILS_API_BASE_URL", "http://api1.raildata.org.uk/product/LDBWS/api/20220120"],
    ["NATIONAL_RAIL_SERVICE_DETAILS_API_BASE_URL", "https://api1.raildata.org.uk/product/LDBWS/api/20220120?redirect=elsewhere"],
  ])("rejects invalid detail configuration: %s = %s", async (name, value) => {
    const fetcher = mockBoard();
    vi.stubEnv(name, value);
    await expect(getRailDetail("one", Date.now() + 20000)).rejects.toMatchObject({ code: "unavailable" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not reuse cached details from a different product URL", async () => {
    const fetcher = mockBoard();
    await getRailDetail("one", Date.now() + 20000);
    vi.stubEnv("NATIONAL_RAIL_SERVICE_DETAILS_API_BASE_URL", "https://api1.raildata.org.uk/other-product/LDBWS/api/20220120");
    await getRailDetail("one", Date.now() + 20000);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
