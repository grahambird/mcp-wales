import reference from "./stations.json";
export type Station = { name: string; crs: string };
export class StationError extends Error {
  constructor(public code: "unknown_station" | "ambiguous_station", message: string, public candidates: Station[] = []) { super(message); }
}
function normalize(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/&/g, " and ").replace(/[()'’.,-]/g, " ").replace(/\s+/g, " ").trim();
}
export function resolveStation(value: string, stations: Station[] = reference.stations): Station {
  const query = normalize(value);
  const matches = stations.filter(s => s.crs.toLowerCase() === query || normalize(s.name) === query);
  const unique = [...new Map(matches.map(s => [s.crs, s])).values()];
  if (unique.length === 1) return unique[0];
  const candidates = unique.length ? unique : [...new Map(stations.filter(s => normalize(s.name).startsWith(query + " ")).map(s => [s.crs, s])).values()].slice(0, 10);
  if (candidates.length) throw new StationError("ambiguous_station", "Please specify a full station name or CRS code from the candidates.", candidates);
  throw new StationError("unknown_station", "Station not found in the bundled Great Britain rail reference. Use its full station name or three-letter CRS code; a newly opened station may require a reference refresh.");
}
