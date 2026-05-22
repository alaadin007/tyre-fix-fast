import { assertEquals } from "jsr:@std/assert";
import { extractCoordsFromWebhook } from "../_shared/webhook-location.ts";

Deno.test("does not invent a live location when webhook lat/lng fields are missing", () => {
  const result = extractCoordsFromWebhook({ Body: "25 minutes" });
  assertEquals(result, null);
});

Deno.test("accepts a real live location when webhook lat/lng fields are present", () => {
  const result = extractCoordsFromWebhook({
    Latitude: "51.5001",
    Longitude: "-0.1201",
  });

  assertEquals(result, { lat: 51.5001, lng: -0.1201 });
});