import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, MessageSquare, Bot } from "lucide-react";

type LogRow = {
  id: string;
  created_at: string;
  technician_id: string | null;
  phone: string;
  channel: string | null;
  inbound_body: string | null;
  has_media: boolean;
  media_count: number;
  detected_intent: string | null;
  prior_status: string | null;
  next_status: string | null;
  route_taken: string;
  ai_extracted: Record<string, unknown> | null;
  reply_sent: string | null;
  notes: string | null;
};

const ROUTE_COLORS: Record<string, string> = {
  intake_start: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  intake_started_welcome_only: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  intake_continue: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  intake_in_progress: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  intake_complete_submitted_for_review:
    "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  join_phrase_already_approved:
    "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  join_phrase_pending_review:
    "bg-blue-500/15 text-blue-700 border-blue-500/30",
  join_phrase_previously_rejected: "bg-red-500/15 text-red-700 border-red-500/30",
  join_phrase_unknown_status_restart:
    "bg-purple-500/15 text-purple-700 border-purple-500/30",
};

export function OnboardingLogs() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tech_onboarding_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setLoading(false);
    if (!error) setRows((data || []) as LogRow[]);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("onboarding-logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tech_onboarding_logs" },
        (payload) => setRows((r) => [payload.new as LogRow, ...r].slice(0, 200)),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.phone, r.route_taken, r.detected_intent, r.inbound_body, r.reply_sent]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, filter]);

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Technician onboarding logs</h2>
          <p className="text-xs text-muted-foreground">
            Every inbound message routed through technician sign-up, with the
            detected intent and routing decision. Use this to debug why
            someone landed in the wrong flow.
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={load}>
          Refresh
        </Button>
      </div>

      <div className="mt-3">
        <Input
          placeholder="Filter by phone, route, intent, or message text…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No log entries yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {filtered.map((r) => {
            const open = expanded[r.id];
            const routeClass =
              ROUTE_COLORS[r.route_taken] ||
              "bg-muted text-muted-foreground border-border";
            return (
              <li
                key={r.id}
                className="rounded-lg border border-border bg-background"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((e) => ({ ...e, [r.id]: !e[r.id] }))
                  }
                  className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-muted/50"
                >
                  {open ? (
                    <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono text-foreground">
                        {r.phone}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </span>
                      {r.channel && (
                        <Badge variant="outline" className="text-[10px]">
                          {r.channel}
                        </Badge>
                      )}
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${routeClass}`}
                      >
                        {r.route_taken}
                      </span>
                      {r.detected_intent && (
                        <span className="text-[10px] text-muted-foreground">
                          intent: {r.detected_intent}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {(r.prior_status ?? "—")} → {(r.next_status ?? "—")}
                      </span>
                      {r.has_media && (
                        <Badge variant="secondary" className="text-[10px]">
                          📎 {r.media_count}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm text-foreground">
                      <MessageSquare className="mr-1 inline h-3 w-3 text-muted-foreground" />
                      {r.inbound_body || <span className="italic text-muted-foreground">(empty body)</span>}
                    </p>
                  </div>
                </button>

                {open && (
                  <div className="space-y-2 border-t border-border bg-muted/30 px-3 py-3 text-xs">
                    <div>
                      <p className="font-semibold text-muted-foreground">
                        Inbound
                      </p>
                      <pre className="mt-0.5 whitespace-pre-wrap rounded bg-background p-2">
                        {r.inbound_body || "(empty)"}
                      </pre>
                    </div>
                    {r.reply_sent && (
                      <div>
                        <p className="font-semibold text-muted-foreground">
                          <Bot className="inline h-3 w-3" /> Reply
                        </p>
                        <pre className="mt-0.5 whitespace-pre-wrap rounded bg-background p-2">
                          {r.reply_sent}
                        </pre>
                      </div>
                    )}
                    {r.ai_extracted && (
                      <div>
                        <p className="font-semibold text-muted-foreground">
                          AI extraction
                        </p>
                        <pre className="mt-0.5 overflow-x-auto rounded bg-background p-2">
                          {JSON.stringify(r.ai_extracted, null, 2)}
                        </pre>
                      </div>
                    )}
                    {r.technician_id && (
                      <p className="text-muted-foreground">
                        technician_id:{" "}
                        <span className="font-mono">{r.technician_id}</span>
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
