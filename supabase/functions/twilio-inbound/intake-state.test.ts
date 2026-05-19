import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { processCustomerIntake } from "../_shared/intake-state.ts";

type Row = Record<string, unknown>;

class MockQuery {
  private filters: Array<(row: Row) => boolean> = [];
  private patch: Record<string, unknown> | null = null;

  constructor(
    private tables: Record<string, Row[]>,
    private table: string,
  ) {}

  select() { return this; }
  order() { return this; }
  limit() { return this; }
  gte(column: string, value: string) {
    this.filters.push((row) => String(row[column] ?? "") >= value);
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }
  neq(column: string, value: unknown) {
    this.filters.push((row) => row[column] !== value);
    return this;
  }
  update(patch: Record<string, unknown>) {
    this.patch = patch;
    return this;
  }

  async maybeSingle() {
    const rows = this.filteredRows();
    return { data: rows[0] ?? null, error: null };
  }

  async single() {
    if (this.patch) {
      const row = this.filteredRows()[0];
      if (!row) return { data: null, error: new Error("Row not found") };
      Object.assign(row, this.patch);
      return { data: row, error: null };
    }
    const rows = this.filteredRows();
    return { data: rows[0] ?? null, error: null };
  }

  private filteredRows() {
    return (this.tables[this.table] ?? []).filter((row) => this.filters.every((fn) => fn(row)));
  }
}

class MockSupabase {
  constructor(private tables: Record<string, Row[]>) {}

  from(table: string) {
    return new MockQuery(this.tables, table);
  }
}

Deno.test("service intent during awaiting_location is acknowledged before location prompt", async () => {
  const phone = "+441234567890";
  const jobId = "job-1";
  const message = "My tyre is flat. Can someone come to my location?";
  const tables = {
    customers: [],
    conversations: [{
      id: "conv-1",
      customer_phone: phone,
      current_job_id: jobId,
      step: "awaiting_location",
      last_message_at: new Date().toISOString(),
      context: {},
    }],
    jobs: [{
      id: jobId,
      customer_phone: phone,
      customer_name: "Customer",
      postcode: "",
      issue_type: "unknown",
      issue_description: null,
      photo_urls: [],
      vehicle_reg: null,
      affected_wheels: [],
      status: "intake_pending",
      updated_at: new Date().toISOString(),
    }],
  };

  const outcome = await processCustomerIntake(
    new MockSupabase(tables) as never,
    { from: phone, body: message, mediaUrls: [], channel: "whatsapp" },
  );

  assertStringIncludes(outcome.reply, "Got it — I've noted the tyre issue and your service request.");
  assertStringIncludes(outcome.reply, "Your *current* location");
  assert(!outcome.reply.includes("I couldn't read a postcode or location from that"));
  assertEquals(tables.jobs[0].issue_description, message);
  assertEquals(tables.jobs[0].issue_type, "flat tyre");
  assertEquals(outcome.conversation.step, "awaiting_location");
});