import { assertEquals } from "jsr:@std/assert";
import { resolveAdminJobRefAction } from "../_shared/admin-job-ref-routing.ts";

Deno.test("yes plus ref continues pending broadcast ref request instead of reopening technician list", () => {
  assertEquals(
    resolveAdminJobRefAction({
      step: "await_ref_for_broadcast",
      stateJobId: "d8019d00-0000-0000-0000-000000000000",
      yesPlusRef: "D8019D",
      refOnly: null,
    }),
    { action: "broadcast", ref: "d8019d" },
  );
});

Deno.test("matching yes plus ref confirms pending broadcast", () => {
  assertEquals(
    resolveAdminJobRefAction({
      step: "await_broadcast_confirm",
      stateJobId: "d8019d00-0000-0000-0000-000000000000",
      yesPlusRef: "D8019D",
      refOnly: null,
    }),
    { action: "broadcast", ref: "d8019d" },
  );
});

Deno.test("bare ref while waiting for list lookup keeps technician preview flow", () => {
  assertEquals(
    resolveAdminJobRefAction({
      step: "await_ref_for_list",
      stateJobId: null,
      yesPlusRef: null,
      refOnly: "D8019D",
    }),
    { action: "list", ref: "d8019d" },
  );
});