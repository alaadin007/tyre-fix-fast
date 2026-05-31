export type AdminJobRefAction = "send_quote" | "share_details" | "broadcast" | "list";

export function resolveAdminJobRefAction(args: {
  step?: string | null;
  stateJobId?: string | null;
  refOnly?: string | null;
  yesPlusRef?: string | null;
}): { action: AdminJobRefAction; ref: string } | null {
  const step = args.step ?? null;
  const refOnly = args.refOnly?.toLowerCase() ?? null;
  const yesPlusRef = args.yesPlusRef?.toLowerCase() ?? null;
  const refFromMsg = yesPlusRef ?? refOnly;

  if (refFromMsg) {
    if (step === "await_send_quote_confirm" || step === "await_ref_for_send_quote") {
      return { action: "send_quote", ref: refFromMsg };
    }
    if (step === "await_share_details_confirm" || step === "await_ref_for_share_details") {
      return { action: "share_details", ref: refFromMsg };
    }
    if (step === "await_ref_for_broadcast") {
      return { action: "broadcast", ref: refFromMsg };
    }

    const sameJobAsState = !!args.stateJobId && String(args.stateJobId).toLowerCase().startsWith(refFromMsg);
    if (step === "await_broadcast_confirm" && sameJobAsState) {
      return { action: "broadcast", ref: refFromMsg };
    }
  }

  if ((step === "await_ref_for_list" && refOnly) || yesPlusRef) {
    return { action: "list", ref: (step === "await_ref_for_list" && refOnly) ? refOnly : yesPlusRef! };
  }

  return null;
}