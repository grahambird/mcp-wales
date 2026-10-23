import { z } from "zod";
import { getRailBoard, getRailDetail, RailError } from "./client";
import { resolveStation } from "./stations";
import { railResultSchema } from "./schemas";
import { prediction, railTime } from "./time";

export async function liveDepartures(station: string, destinationName: string | undefined, limit: number): Promise<z.infer<typeof railResultSchema>> {
  const origin = resolveStation(station);
  const destination = destinationName ? resolveStation(destinationName) : null;
  if (origin.crs === destination?.crs) throw new RailError("invalid_input", "Origin and destination must be different stations.");
  const deadline = Date.now() + 20000;
  const { value: board, retrievedAt } = await getRailBoard(origin.crs, destination?.crs, deadline);
  if (board.crs !== origin.crs) throw new RailError("unavailable", "National Rail returned an unexpected station board.");
  const services: z.infer<typeof railResultSchema>["services"] = [];
  // Two workers bound detail requests. A failure cannot masquerade as an empty board.
  const candidates = [...(board.trainServices ?? [])];
  let failed = false;
  async function worker() {
    try {
      while (candidates.length && !failed) {
        const service = candidates.shift()!;
        if (service.serviceType && service.serviceType !== "train") continue;
        const groups = service.subsequentCallingPoints ?? [];
        const callingPoint = destination ? groups.filter(g => g.serviceChangeRequired !== true && (!g.serviceType || g.serviceType === "train")).flatMap(g => g.callingPoint.map(point => ({ ...point, associationCancelled: g.assocIsCancelled === true }))).find(p => p.crs === destination.crs) : undefined;
        // A matching direction/final destination never substitutes for a confirmed calling point.
        if (destination && !callingPoint) continue;
        const { value: detail } = await getRailDetail(service.serviceID, deadline);
        if (detail.crs !== origin.crs) throw new RailError("unavailable", "National Rail returned unexpected service details.");
        if (detail.atd || service.etd === "Departed" || detail.etd === "Departed") continue;
        const scheduled = railTime(detail.std ?? service.std, board.generatedAt);
        const dep = prediction(scheduled, detail.etd ?? service.etd);
        const cancelled = detail.isCancelled === true || service.isCancelled === true || service.etd === "Cancelled" || detail.etd === "Cancelled" || callingPoint?.isCancelled === true || callingPoint?.associationCancelled === true || (destination !== null && service.filterLocationCancelled === true);
        const delay = scheduled && dep.time ? Math.round((Date.parse(dep.time) - Date.parse(scheduled)) / 60000) : null;
        const arrival = callingPoint ? railTime(callingPoint.st, scheduled ?? board.generatedAt) : null;
        const arr = prediction(arrival, callingPoint?.et);
        services.push({ scheduled_departure: scheduled, expected_departure: cancelled ? null : dep.time,
          departure_information: cancelled ? "unavailable" : dep.information,
          final_destinations: (service.destination ?? []).map(d => ({ name: d.locationName, crs: d.crs })),
          platform: board.platformAvailable === false ? null : service.platform?.trim() || null,
          status: cancelled ? "cancelled" : delay !== null ? delay > 0 ? "delayed" : "on_time" : service.etd === "Delayed" || detail.etd === "Delayed" ? "delayed" : "unknown",
          delay_minutes: cancelled ? null : delay, scheduled_arrival: arrival, expected_arrival: cancelled ? null : arr.time,
          arrival_information: cancelled ? "unavailable" : arr.information,
        });
      }
    } catch (error) { failed = true; throw error; }
  }
  if (board.areServicesAvailable !== false) {
    const completed = await Promise.allSettled([worker(), worker()]);
    const failure = completed.find(item => item.status === "rejected");
    if (failure?.status === "rejected") throw failure.reason;
  }
  services.sort((a, b) => {
    const time = (s: typeof a) => Date.parse(s.expected_departure ?? s.scheduled_departure ?? "") || Infinity;
    return time(a) - time(b);
  });
  return { origin, destination, retrieved_at: retrievedAt, generated_at: board.generatedAt, timezone: "Europe/London", services: services.slice(0, limit),
    status: board.areServicesAvailable === false ? "services_unavailable" : services.length ? "ok" : "no_services",
    explanation: board.areServicesAvailable === false ? "National Rail has suppressed services for this station; check the official departure board." : services.length ? null : "No matching direct trains were returned in the API's next 120 minutes. This does not establish that the last train has departed.",
    source_url: "https://www.nationalrail.co.uk/live-trains/departures/" + origin.crs.toLowerCase() + "/",
    attribution: "Powered by National Rail. Contains information licensed under the National Rail Enquiries Open Government Licence.",
    limitations: "Direct trains only. Up to 10 services supplied by Darwin in a 120-minute window, sorted by expected departure where known, otherwise scheduled time. This is not an exhaustive timetable. Cancellations are not available trains; unknown predictions are not confirmation of punctuality. Ambiguous or uncertain clock times are null. Live information can change after retrieval.",
  };
}
