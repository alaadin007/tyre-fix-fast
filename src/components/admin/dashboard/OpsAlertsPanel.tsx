import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fmtRelative, shortRef } from "@/hooks/useDashboardData";

type OpsAlert = {
  id: string;
  level: string | null;
  title: string | null;
  body: string | null;
  job_id: string | null;
  read: boolean | null;
  created_at: string;
};

export function OpsAlertsPanel() {
  const [alerts, setAlerts] = useState<OpsAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("ops_alerts")
      .select("id, level, title, body, job_id, read, created_at")
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(20);
    setAlerts((data ?? []) as OpsAlert[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("ops-alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "ops_alerts" }, load)
      .subscribe();
    const id = setInterval(load, 30_000);
    return () => {
      clearInterval(id);
      supabase.removeChannel(ch);
    };
  }, []);

  const markRead = async (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    await supabase.from("ops_alerts").update({ read: true }).eq("id", id);
  };

  const markAllRead = async () => {
    const ids = alerts.map((a) => a.id);
    setAlerts([]);
    if (ids.length > 0) await supabase.from("ops_alerts").update({ read: true }).in("id", ids);
  };

  const levelStyles = (level: string | null) => {
    const l = (level ?? "info").toLowerCase();
    if (l === "critical" || l === "error") return "border-rose-500/40 bg-rose-500/10 text-rose-100";
    if (l === "warn" || l === "warning") return "border-amber-500/40 bg-amber-500/10 text-amber-100";
    return "border-white/10 bg-white/[0.03] text-foreground";
  };

  return (
    <Card className="border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Bell className="h-4 w-4 text-amber-300" />
          Ops alerts
          {alerts.length > 0 && (
            <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs text-rose-200">
              {alerts.length}
            </span>
          )}
        </div>
        {alerts.length > 0 && (
          <Button size="sm" variant="ghost" onClick={markAllRead}>Mark all read</Button>
        )}
      </div>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : alerts.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> No unread alerts.
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <div key={a.id} className={`rounded border p-3 text-sm ${levelStyles(a.level)}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span className="truncate">{a.title ?? "Alert"}</span>
                  </div>
                  {a.body && (
                    <div className="mt-1 text-xs opacity-90">{a.body}</div>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] opacity-70">
                    <span>{fmtRelative(a.created_at)}</span>
                    {a.job_id && (
                      <Link
                        to={`/admin/dashboard/jobs?open=${a.job_id}`}
                        className="font-mono underline-offset-2 hover:underline"
                      >
                        #{shortRef(a.job_id)}
                      </Link>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => markRead(a.id)}>
                  Mark read
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
