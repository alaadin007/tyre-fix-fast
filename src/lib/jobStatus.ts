// Friendly labels for the internal job.status values used by the WhatsApp flow.
// We DO NOT change the underlying statuses — this only maps them for display.

export const JOB_STATUS_LABELS: Record<string, string> = {
  pending: "New Job",
  intake_pending: "Waiting for Customer Details",
  intake_complete: "Ready for Admin Review",
  awaiting_approval: "Ready for Admin Review",
  broadcasting: "Awaiting Quotes",
  quoted: "Quote Received",
  sent: "Quote Sent to Customer",
  awaiting_payment: "Quote Sent to Customer",
  paid: "Customer Paid",
  accepted: "Both Parties Connected",
  in_progress: "In Progress",
  completed: "Completed",
  closed: "Closed",
  cancelled: "Cancelled",
};

export function jobStatusLabel(status: string): string {
  return JOB_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

// Filter chips shown in the Jobs page (internal value → label)
export const JOB_STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "New Job" },
  { value: "intake_pending", label: "Waiting for Customer Details" },
  { value: "awaiting_approval", label: "Ready for Admin Review" },
  { value: "broadcasting", label: "Awaiting Quotes" },
  { value: "quoted", label: "Quote Received" },
  { value: "awaiting_payment", label: "Quote Sent to Customer" },
  { value: "paid", label: "Customer Paid" },
  { value: "accepted", label: "Both Parties Connected" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];

export function paymentStatusLabel(s: string | null | undefined): string {
  switch (s) {
    case "paid": return "Paid";
    case "pending": return "Pending";
    case "refunded": return "Refunded";
    case "failed": return "Failed";
    default: return s ?? "—";
  }
}
