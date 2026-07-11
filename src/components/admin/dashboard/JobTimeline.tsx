import { useEffect, useMemo, useState } from "react";
import {
  Clock, Send, MessageSquare, FileText, CreditCard, CheckCircle2,
  AlertCircle, Bot, User, Wrench, ShieldCheck, Share2, XCircle,
} from "lucide-react";
import type { DashJob, DashQuote, DashAllocation, DashTech } from "@/hooks/useDashboardData";
import { fmtRelative } from "@/hooks/useDashboardData";
import { supabase } from "@/integrations/supabase/client";

type Actor = "Customer" | "AI" | "Admin" | "Technician" | "Payment System" | "System";

type Event = {
  at: string;
  icon: any;
  title: string;
  detail?: string;
  actor: Actor;
  tone: "primary" | "emerald" | "amber" | "sky" | "rose" | "violet" | "slate";
};

type Msg = {
  id: string;
  direction: string;
  from_number: string | null;
  to_number: string | null;
  body: string | null;
  created_at: string;
  channel: string | null;
};

const actorTone: Record<Actor, Event["tone"]> = {
  Customer: "sky",
  AI: "violet",
  Admin: "primary",
  Technician: "amber",
  "Payment System": "emerald",
  System: "slate",
};

const actorIcon: Record<Actor, any> = {
  Customer: User,
  AI: Bot,
  Admin: ShieldCheck,
  Technician: Wrench,
  "Payment System": CreditCard,
  System: AlertCircle,
};

function truncate(s: string, n = 140) {
  s = s.replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export function JobTimeline({
  job, quotes, allocations, techs,
}: {
  job: DashJob;
  quotes: DashQuote[];
  allocations: DashAllocation[];
  techs: DashTech[];
}) {
  const [messages, setMessages] = useState<Msg[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("sms_messages")
        .select("id,direction,from_number,to_number,body,created_at,channel")
        .eq("job_id", job.id)
        .order("created_at", { ascending: true })
        .limit(300);
      if (!cancelled) setMessages((data ?? []) as Msg[]);
    };
    load();
    const ch = supabase
      .channel(`timeline-${job.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sms_messages" }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [job.id]);

  const techById = useMemo(() => {
    const m = new Map<string, DashTech>();
    techs.forEach((t) => m.set(t.id, t));
    return m;
  }, [techs]);

  const techByPhone = useMemo(() => {
    const m = new Map<string, DashTech>();
    techs.forEach((t) => {
      const keys = [t.phone, t.whatsapp].filter(Boolean) as string[];
      keys.forEach((p) => m.set(p.replace(/\s+/g, ""), t));
    });
    return m;
  }, [techs]);

  const techName = (id: string | null) =>
    (id && techById.get(id)?.name) ?? (id ? id.slice(0, 6) : "—");

  const events = useMemo<Event[]>(() => {
    const ev: Event[] = [];
    const customerPhone = (job.customer_phone ?? "").replace(/\s+/g, "");

    // 1. Customer first message + AI conversation from sms_messages
    let firstCustomerSeen = false;
    let aiSent = 0;
    for (const m of messages) {
      const from = (m.from_number ?? "").replace(/\s+/g, "");
      const to = (m.to_number ?? "").replace(/\s+/g, "");
      const inbound = m.direction === "inbound";
      const body = (m.body ?? "").trim();

      // Skip messages that are clearly to/from technicians for this job (we cover those below)
      const isTechSide = techByPhone.has(from) || techByPhone.has(to);

      if (inbound && from === customerPhone) {
        if (!firstCustomerSeen) {
          ev.push({
            at: m.created_at, icon: User, actor: "Customer", tone: "sky",
            title: "Customer first message",
            detail: body ? truncate(body) : "[media]",
          });
          firstCustomerSeen = true;
        } else {
          ev.push({
            at: m.created_at, icon: User, actor: "Customer", tone: "sky",
            title: "Customer reply",
            detail: body ? truncate(body) : "[media]",
          });
        }
      } else if (!inbound && to === customerPhone) {
        aiSent++;
        ev.push({
          at: m.created_at, icon: Bot, actor: "AI", tone: "violet",
          title: aiSent === 1 ? "AI greeting sent" : "AI question sent",
          detail: body ? truncate(body) : undefined,
        });
      } else if (isTechSide) {
        const tech = techByPhone.get(from) ?? techByPhone.get(to);
        ev.push({
          at: m.created_at, icon: inbound ? Wrench : Send,
          actor: inbound ? "Technician" : "AI",
          tone: inbound ? "amber" : "violet",
          title: inbound
            ? `Technician message — ${tech?.name ?? "Technician"}`
            : `Sent to technician — ${tech?.name ?? "Technician"}`,
          detail: body ? truncate(body) : undefined,
        });
      }
    }

    // 2. Customer details received (when intake completed)
    if (job.customer_name || job.vehicle_reg || job.postcode) {
      ev.push({
        at: job.created_at, icon: FileText, actor: "AI", tone: "violet",
        title: "Customer details received",
        detail: [
          job.customer_name, job.vehicle_reg, job.postcode,
          job.issue_type, job.tyre_size,
        ].filter(Boolean).join(" · ") || undefined,
      });
    }

    // 3. Admin notified / matching / broadcast
    if (["broadcasting", "awaiting_approval", "intake_complete"].includes(job.status) || allocations.some(a => a.job_id === job.id)) {
      ev.push({
        at: job.created_at, icon: ShieldCheck, actor: "System", tone: "slate",
        title: "Admin notified — new job ready for review",
      });
    }

    const jobAllocs = allocations.filter((a) => a.job_id === job.id);
    if (jobAllocs.length > 0) {
      const first = jobAllocs.reduce((a, b) => new Date(a.created_at) < new Date(b.created_at) ? a : b);
      ev.push({
        at: first.created_at, icon: Send, actor: "Admin", tone: "primary",
        title: `Matching technicians found (${jobAllocs.length})`,
        detail: jobAllocs.slice(0, 4).map((a) => techName(a.technician_id)).join(", "),
      });
      for (const a of jobAllocs) {
        ev.push({
          at: a.created_at, icon: Send, actor: "Admin", tone: "primary",
          title: `Job broadcast → ${techName(a.technician_id)}`,
          detail: `Status: ${a.status}${a.match_score != null ? ` · score ${Number(a.match_score).toFixed(2)}` : ""}`,
        });
        if (a.approved_at) {
          ev.push({
            at: a.approved_at, icon: CheckCircle2, actor: "Admin", tone: "emerald",
            title: `Allocation approved — ${techName(a.technician_id)}`,
            detail: a.approved_by ?? undefined,
          });
        }
      }
    }

    // 4. Technician quotes
    const jobQuotes = quotes.filter((q) => q.job_id === job.id);
    for (const q of jobQuotes) {
      ev.push({
        at: q.created_at, icon: FileText, actor: "Technician",
        tone: q.status === "accepted" ? "emerald" : q.status === "lost" ? "rose" : "amber",
        title: `Quote ${q.status} — £${q.price_gbp ?? "?"} · ${q.eta_minutes ?? "?"} min`,
        detail: `From ${techName(q.technician_id)}${q.tyre_included ? " · incl. tyre" : ""}`,
      });
      if (q.status === "accepted") {
        ev.push({
          at: q.created_at, icon: Share2, actor: "Admin", tone: "primary",
          title: "Quote sent to customer",
          detail: `${techName(q.technician_id)} · £${q.price_gbp ?? "?"}`,
        });
      }
    }

    // 5. Payment link & payment
    if (job.stripe_checkout_url) {
      ev.push({
        at: job.updated_at, icon: CreditCard, actor: "Payment System", tone: "emerald",
        title: "Payment link sent",
        detail: "Stripe checkout link delivered to customer",
      });
    }
    if (job.platform_fee_paid_at) {
      ev.push({
        at: job.platform_fee_paid_at, icon: CreditCard, actor: "Payment System", tone: "emerald",
        title: "Payment received",
        detail: "Platform fee paid",
      });
    }
    if (job.platform_fee_refunded_at) {
      ev.push({
        at: job.platform_fee_refunded_at, icon: CreditCard, actor: "Payment System", tone: "rose",
        title: "Platform fee refunded",
      });
    }

    // 6. Technician details shared (job moved to in_progress with assigned tech)
    if (job.assigned_technician_id && ["in_progress", "completed", "paid", "closed"].includes(job.status)) {
      ev.push({
        at: job.updated_at, icon: Share2, actor: "Admin", tone: "primary",
        title: "Technician details shared with customer",
        detail: techName(job.assigned_technician_id),
      });
    }

    // 7. Completion / closure / cancellation
    if (job.status === "completed" || job.status === "paid") {
      ev.push({
        at: job.updated_at, icon: CheckCircle2, actor: "System", tone: "emerald",
        title: "Job completed",
      });
    }
    if (job.status === "closed") {
      ev.push({
        at: job.updated_at, icon: CheckCircle2, actor: "Admin", tone: "slate",
        title: "Job closed",
      });
    }
    if (job.status === "cancelled") {
      ev.push({
        at: job.updated_at, icon: XCircle, actor: "Admin", tone: "rose",
        title: "Job cancelled",
      });
    }

    // Always show job created at top
    ev.push({
      at: job.created_at, icon: AlertCircle, actor: "System", tone: "slate",
      title: "Job created",
      detail: `${job.customer_name ?? "Customer"} · ${job.postcode ?? ""} · ${job.issue_type ?? ""}`,
    });

    return ev.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [job, quotes, allocations, messages, techByPhone, techById]);

  const toneClass: Record<string, string> = {
    primary: "bg-primary/15 text-primary",
    emerald: "bg-emerald-500/15 text-emerald-300",
    amber: "bg-amber-500/15 text-amber-300",
    sky: "bg-sky-500/15 text-sky-300",
    rose: "bg-rose-500/15 text-rose-300",
    violet: "bg-violet-500/15 text-violet-300",
    slate: "bg-slate-500/15 text-slate-300",
  };

  return (
    <div className="space-y-3">
      {events.length === 0 && <div className="text-sm text-muted-foreground">No timeline events yet.</div>}
      {events.map((e, i) => {
        const Icon = e.icon;
        return (
          <div key={i} className="flex gap-3">
            <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${toneClass[e.tone]}`}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">{e.title}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${toneClass[actorTone[e.actor]]}`}>
                  {e.actor}
                </span>
              </div>
              {e.detail && <div className="text-xs text-muted-foreground">{e.detail}</div>}
              <div className="mt-0.5 flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                <Clock className="h-3 w-3" />
                {new Date(e.at).toLocaleString()} · {fmtRelative(e.at)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
