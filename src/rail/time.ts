const clock = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
/** Resolve a board's HH:mm against its generation time, including midnight and BST.
 * Repeated autumn clock times are ambiguous in Darwin's public format: retain null.
 */
export function railTime(value: string | null | undefined, reference: string): string | null {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const anchor = Date.parse(reference);
  if (!Number.isFinite(anchor)) return null;
  const parts = Object.fromEntries(clock.formatToParts(anchor).map(p => [p.type, p.value]));
  const day = Date.UTC(+parts.year, +parts.month - 1, +parts.day);
  const [h, m] = value.split(":").map(Number);
  const candidates: number[] = [];
  for (const delta of [-1, 0, 1]) for (const offset of [0, 60]) {
    const wall = day + delta * 86400000 + (h * 60 + m) * 60000;
    const time = wall - offset * 60000;
    const actual = Object.fromEntries(clock.formatToParts(time).map(p => [p.type, p.value]));
    const target = new Date(wall).toISOString().slice(0, 10);
    if (`${actual.year}-${actual.month}-${actual.day}` === target && `${actual.hour}:${actual.minute}` === value) candidates.push(time);
  }
  candidates.sort((a, b) => Math.abs(a - anchor) - Math.abs(b - anchor));
  if (!candidates.length || Math.abs(candidates[0] - anchor) > 12 * 3600000) return null;
  // Both occurrences on the same local day are plausible; never invent a DST offset.
  if (candidates.some(t => t !== candidates[0] && Math.abs(t - candidates[0]) === 3600000)) return null;
  return new Date(candidates[0]).toISOString();
}
export function prediction(scheduled: string | null, raw: string | null | undefined) {
  if (raw === "On time") return { time: scheduled, information: "live" as const };
  const time = scheduled ? railTime(raw, scheduled) : null;
  return { time, information: time ? "live" as const : raw ? "unavailable" as const : "timetable_only" as const };
}
