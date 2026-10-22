import { z } from "zod";
const field = z.string().max(500);
const optionalText = field.nullish();
const location = z.object({ locationName: field, crs: z.string().regex(/^[A-Z?]{3}$/) });
const point = location.extend({ st: optionalText, et: optionalText, at: optionalText, isCancelled: z.boolean().optional() });
const groups = z.array(z.object({ callingPoint: z.array(point).max(100), serviceType: z.enum(["train", "bus", "ferry"]).optional(), serviceChangeRequired: z.boolean().optional(), assocIsCancelled: z.boolean().optional() })).max(20).nullish();
export const serviceSchema = z.object({
  serviceID: z.string().min(1).max(200), std: field, etd: optionalText, platform: optionalText,
  destination: z.array(location).max(20).nullish(), isCancelled: z.boolean().optional(),
  filterLocationCancelled: z.boolean().optional(), serviceType: z.enum(["train", "bus", "ferry"]).optional(), subsequentCallingPoints: groups,
});
export const boardSchema = z.object({ generatedAt: z.iso.datetime({ offset: true }), crs: z.string().regex(/^[A-Z]{3}$/), trainServices: z.array(serviceSchema).max(10).nullish(), platformAvailable: z.boolean().optional(), areServicesAvailable: z.boolean().optional() });
export const detailSchema = z.object({ crs: z.string(), std: optionalText, etd: optionalText, atd: optionalText, isCancelled: z.boolean().optional() });
export type RailService = z.infer<typeof serviceSchema>;
export const stationOutput = z.object({ name: z.string(), crs: z.string() });
export const railResultSchema = z.object({
  origin: stationOutput, destination: stationOutput.nullable(), retrieved_at: z.string(), generated_at: z.string(), timezone: z.literal("Europe/London"),
  services: z.array(z.object({
    scheduled_departure: z.string().nullable(), expected_departure: z.string().nullable(), departure_information: z.enum(["live", "timetable_only", "unavailable"]),
    final_destinations: z.array(stationOutput), platform: z.string().nullable(), status: z.enum(["on_time", "delayed", "cancelled", "unknown"]), delay_minutes: z.number().nullable(),
    scheduled_arrival: z.string().nullable(), expected_arrival: z.string().nullable(), arrival_information: z.enum(["live", "timetable_only", "unavailable"]),
  })),
  status: z.enum(["ok", "no_services", "services_unavailable"]), explanation: z.string().nullable(), source_url: z.string(), attribution: z.string(), limitations: z.string(),
});
