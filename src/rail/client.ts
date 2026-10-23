import { z } from "zod";
import { TtlCache } from "@/lib/cache";
import { logEvent } from "@/lib/logger";
import { boardSchema, detailSchema } from "./schemas";

export class RailError extends Error {
  constructor(public code: "unavailable" | "invalid_input", message: string) { super(message); }
}
const cache = new TtlCache(15_000);
let active = 0;
let starts: number[] = [];
let cooldown = 0;
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const unavailable = () => new RailError("unavailable", "National Rail live information is temporarily unavailable. Please try again later.");
type RailProduct = "board" | "detail";
function configuration(product: RailProduct) {
  const key = product === "board" ? process.env.NATIONAL_RAIL_API_KEY : process.env.NATIONAL_RAIL_SERVICE_DETAILS_API_KEY;
  const base = product === "board" ? process.env.NATIONAL_RAIL_API_BASE_URL : process.env.NATIONAL_RAIL_SERVICE_DETAILS_API_BASE_URL;
  if (!key || !base) throw unavailable();
  let url: URL;
  try { url = new URL(base); } catch { throw unavailable(); }
  if (url.protocol !== "https:" || url.hostname !== "api1.raildata.org.uk" || url.port || url.username || url.password || url.search || url.hash || !/^\/[a-zA-Z0-9_-]+\/LDBWS\/api\/20220120\/?$/.test(url.pathname)) throw unavailable();
  return { key, base: url.href.replace(/\/$/, "") };
}
async function acquire(deadline: number) {
  while (Date.now() < deadline) {
    const now = Date.now();
    if (cooldown > now) throw unavailable();
    starts = starts.filter(t => t > now - 10000);
    if (active < 2 && starts.length < 20) { active++; starts.push(now); return; }
    await wait(Math.min(50, deadline - now));
  }
  throw unavailable();
}
async function readJson(response: Response) {
  const max = 256 * 1024;
  if (Number(response.headers.get("content-length")) > max) { await response.body?.cancel(); throw unavailable(); }
  const reader = response.body?.getReader();
  if (!reader) throw unavailable();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > max) { await reader.cancel(); throw unavailable(); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } finally { reader.releaseLock(); }
}
async function request<T extends z.ZodType>(product: RailProduct, path: string, schema: T, deadline: number): Promise<{ value: z.infer<T>; retrievedAt: string }> {
  const { key, base } = configuration(product);
  return cache.getOrLoad(`${base}/${path}`, async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      await acquire(deadline);
      const started = performance.now();
      let status: number | undefined;
      try {
        const response = await fetch(`${base}/${path}`, { cache: "no-store", redirect: "error", headers: { Accept: "application/json", "x-apikey": key, "User-Agent": "mcp-wales/0.1 (+https://mcp.wales)" }, signal: AbortSignal.timeout(Math.max(1, Math.min(6000, deadline - Date.now()))) });
        status = response.status;
        if (status === 429) {
          const header = response.headers.get("retry-after");
          const delay = header && /^\d+$/.test(header) ? +header * 1000 : header ? Date.parse(header) - Date.now() : 10000;
          cooldown = Math.max(cooldown, Date.now() + (Number.isFinite(delay) ? Math.max(1000, delay) : 10000));
        }
        if (!response.ok) {
          await response.body?.cancel();
          if (status >= 500 && attempt === 0) continue;
          throw unavailable();
        }
        const value = schema.safeParse(await readJson(response));
        if (!value.success) throw unavailable();
        return { value: value.data, retrievedAt: new Date().toISOString() };
      } catch (error) {
        if (error instanceof RailError || error instanceof SyntaxError || attempt === 1) throw unavailable();
      } finally {
        active--;
        logEvent("info", "upstream_request", { provider: "national_rail", duration_ms: Math.round(performance.now() - started), retry_count: attempt, upstream_status: status });
      }
      await wait(Math.min(200, Math.max(0, deadline - Date.now())));
    }
    throw unavailable();
  });
}
export function getRailBoard(origin: string, destination: string | undefined, deadline: number) {
  const query = new URLSearchParams({ numRows: "10", timeOffset: "0", timeWindow: "120" });
  if (destination) { query.set("filterCrs", destination); query.set("filterType", "to"); }
  return request("board", `GetDepBoardWithDetails/${origin}?${query}`, boardSchema, deadline);
}
export function getRailDetail(id: string, deadline: number) {
  return request("detail", `GetServiceDetails/${encodeURIComponent(id)}`, detailSchema, deadline);
}
export function clearRailStateForTests() { cache.clear(); starts = []; cooldown = 0; }
