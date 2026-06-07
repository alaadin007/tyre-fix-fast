import { cn } from "@/lib/utils";
import { jobStatusLabel } from "@/lib/jobStatus";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  intake_pending: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  intake_complete: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  awaiting_approval: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  broadcasting: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  accepted: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  awaiting_payment: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  in_progress: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  completed: "bg-emerald-600/15 text-emerald-300 border-emerald-600/30",
  paid: "bg-emerald-600/15 text-emerald-300 border-emerald-600/30",
  closed: "bg-white/10 text-muted-foreground border-white/15",
  cancelled: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  declined: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  superseded: "bg-white/10 text-muted-foreground border-white/15",
  lost: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  proposed: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  sent: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  expired: "bg-white/10 text-muted-foreground border-white/15",
};

export function StatusBadge({ status, className, raw }: { status: string; className?: string; raw?: boolean }) {
  const style = STATUS_STYLES[status] ?? "bg-white/10 text-foreground border-white/15";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        style,
        className,
      )}
    >
      {raw ? status.replace(/_/g, " ") : jobStatusLabel(status)}
    </span>
  );
}
