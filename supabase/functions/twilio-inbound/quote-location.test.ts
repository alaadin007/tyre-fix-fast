import { assertEquals } from "jsr:@std/assert";
import { resolveQuoteLocationForAllocation } from "../_shared/quote-location.ts";

Deno.test("does not accept technician location from before the job allocation", () => {
  const result = resolveQuoteLocationForAllocation({
    techPin: null,
    allocationCreatedAt: "2026-05-22T10:00:00.000Z",
    locationRows: [{
      lat: 51.5001,
      lng: -0.1201,
      created_at: "2026-05-22T09:50:00.000Z",
      expires_at: "2026-05-22T17:50:00.000Z",
    }],
    now: new Date("2026-05-22T10:05:00.000Z").getTime(),
  });

  assertEquals(result, { hasPin: false, lat: null, lng: null });
});

Deno.test("accepts technician location shared after the job allocation while still live", () => {
  const result = resolveQuoteLocationForAllocation({
    techPin: null,
    allocationCreatedAt: "2026-05-22T10:00:00.000Z",
    locationRows: [{
      lat: 51.5001,
      lng: -0.1201,
      created_at: "2026-05-22T10:02:00.000Z",
      expires_at: "2026-05-22T18:02:00.000Z",
    }],
    now: new Date("2026-05-22T10:05:00.000Z").getTime(),
  });

  assertEquals(result, { hasPin: true, lat: 51.5001, lng: -0.1201 });
});

Deno.test("current message pin always satisfies the quote location requirement", () => {
  const result = resolveQuoteLocationForAllocation({
    techPin: { lat: 51.5012, lng: -0.1412 },
    allocationCreatedAt: "2026-05-22T10:00:00.000Z",
    locationRows: [],
  });

  assertEquals(result, { hasPin: true, lat: 51.5012, lng: -0.1412 });
});