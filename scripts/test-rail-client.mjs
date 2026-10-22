// Opt-in live acceptance against a running MCP instance. No fixed mutable service values.
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import assert from "node:assert/strict";
const origin = process.argv[2] || "http://127.0.0.1:3000";
const client = new Client({ name: "mcp-wales-rail-acceptance", version: "0.1.0" });
try {
  await client.connect(new StreamableHTTPClientTransport(new URL("/mcp", origin)));
  const cases = [
    ["get_live_departures", { station: "Heath High Level" }, "HHL", null],
    ["get_live_departures", { station: "HHL" }, "HHL", null],
    ["get_next_trains", { from_station: "Cardiff Central", to_station: "Heath High Level" }, "CDF", "HHL"],
    ["get_next_trains", { from_station: "CDF", to_station: "HLL" }, "CDF", "HLL"],
  ];
  for (const [name, args, from, to] of cases) {
    const call = await client.callTool({ name, arguments: args });
    assert(!call.isError, `${name} returned an execution error`);
    const value = call.structuredContent?.result;
    assert.equal(value?.origin.crs, from);
    assert.equal(value.destination?.crs ?? null, to);
    assert(Number.isFinite(Date.parse(value.retrieved_at)));
    assert(value.services.length <= 5);
    assert(value.attribution.includes("National Rail"));
    for (const service of value.services) {
      assert(["on_time", "delayed", "cancelled", "unknown"].includes(service.status));
      if (service.status === "cancelled") assert.equal(service.expected_departure, null);
      assert(service.platform === null || typeof service.platform === "string");
    }
    console.log(JSON.stringify({ tool: name, from, to, status: value.status, count: value.services.length }));
  }
  console.log("Bounded live contracts passed. Manually compare intermediate calls and multiple trains with the official departure board before enabling production.");
} finally { await client.close(); }
