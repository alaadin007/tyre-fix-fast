// Admin-only server functions (migrated from the admin-* / refund-fee /
// manual-dispatch edge functions). Every handler verifies the caller holds the
// `admin` role before doing privileged work.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { OpsChatMessage, OpsChatResult } from "@/lib/admin/ops-chat.server";

export const adminSendQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { job_id: string; quote_id?: string }) => input)
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin/ops.server");
    await assertAdmin(context);
    const { runAdminSendQuote } = await import("@/lib/admin/send-quote.server");
    return runAdminSendQuote(data);
  });

export const adminForwardQuotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { job_id: string; quote_ids: string[] }) => input)
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin/ops.server");
    await assertAdmin(context);
    const { runAdminForwardQuotes } = await import("@/lib/admin/forward-quotes.server");
    return runAdminForwardQuotes(data);
  });

export const adminShareDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { job_id: string }) => input)
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin/ops.server");
    await assertAdmin(context);
    const { runAdminShareDetails } = await import("@/lib/admin/share-details.server");
    return runAdminShareDetails(data);
  });

export const adminManualDispatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      job_id: string;
      technician_id: string;
      price_gbp: number;
      eta_minutes: number;
      notes?: string;
      origin?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin/ops.server");
    await assertAdmin(context);
    const { runManualDispatch } = await import("@/lib/admin/manual-dispatch.server");
    return runManualDispatch(data);
  });

export const adminRefundFee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { job_id: string; reason?: string }) => input)
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin/ops.server");
    await assertAdmin(context);
    const { runRefundFee } = await import("@/lib/admin/refund-fee.server");
    return runRefundFee(data);
  });

export const adminOpsChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { messages: OpsChatMessage[] }) => input)
  .handler(async ({ data, context }): Promise<OpsChatResult> => {
    const { assertAdmin } = await import("@/lib/admin/ops.server");
    await assertAdmin(context);
    const { runOpsChat } = await import("@/lib/admin/ops-chat.server");
    return runOpsChat(data.messages);
  });
