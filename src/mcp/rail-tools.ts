import { z } from "zod";
import { liveDepartures } from "@/rail/departures";
import { StationError } from "@/rail/stations";
import { RailError } from "@/rail/client";
import { logEvent } from "@/lib/logger";
const station = z.string().trim().min(1).max(100).describe("Full National Rail station name or three-letter CRS code. Great Britain only.");
const limit = z.number().int().min(1).max(10).default(5);
export const liveDeparturesInput = z.object({ station, limit });
export const nextTrainsInput = z.object({ from_station: station, to_station: station, limit });
export const railDescriptions = {
  departures: "Get real-time train departures from a National Rail station in Great Britain, in both directions, with final destinations, expected and scheduled times, platforms, delays and cancellations. Use for the next train leaving a station or departures soon without a destination. Accepts station names or CRS codes. Service timestamps use UK local time with explicit GMT/BST offsets. Results are ordered by departure; select the earliest non-cancelled service. Up to 10 services in Darwin's next 120 minutes; cancelled trains are not available services.",
  next: "Find the next direct trains from one National Rail station to another in Great Britain, including an intermediate destination where the train actually calls. Use for the next train to a station from another station, or from a station to another station. Returns ultimate destinations separately from the requested alighting station, departure and arrival predictions, delays and cancellations. Service timestamps use UK local time with explicit GMT/BST offsets. Results are ordered by departure; select the earliest non-cancelled service. No changes or journey planning. Cancelled trains or cancelled stops are not available services.",
};
async function run(tool: string, operation: () => ReturnType<typeof liveDepartures>) {
  const started = performance.now();
  try {
    const result = await operation();
    logEvent("info", "mcp_tool_call", { tool, outcome: "success", result_count: result.services.length, duration_ms: Math.round(performance.now() - started) });
    return { content: [{ type: "text" as const, text: JSON.stringify(result) }], structuredContent: { result } };
  } catch (error) {
    const safe = error instanceof StationError || error instanceof RailError ? error : error instanceof z.ZodError ? new RailError("invalid_input", "Supply station names or CRS codes and an integer limit from 1 to 10.") : new RailError("unavailable", "National Rail live information is temporarily unavailable.");
    const value = { error: safe.code, message: safe.message, ...(safe instanceof StationError && safe.candidates.length ? { candidates: safe.candidates } : {}) };
    logEvent("warn", "mcp_tool_call", { tool, outcome: "error", error_code: safe.code, duration_ms: Math.round(performance.now() - started) });
    return { isError: true, content: [{ type: "text" as const, text: JSON.stringify(value) }], structuredContent: value };
  }
}
export function runLiveDepartures(input: z.input<typeof liveDeparturesInput>) {
  return run("get_live_departures", () => { const parsed = liveDeparturesInput.parse(input); return liveDepartures(parsed.station, undefined, parsed.limit); });
}
export function runNextTrains(input: z.input<typeof nextTrainsInput>) {
  return run("get_next_trains", () => { const parsed = nextTrainsInput.parse(input); return liveDepartures(parsed.from_station, parsed.to_station, parsed.limit); });
}
