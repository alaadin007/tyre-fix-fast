import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { fmtRelative } from "@/hooks/useDashboardData";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

type Msg = {
  id: string;
  direction: string;
  from_number: string;
  to_number: string;
  body: string;
  channel: string;
  created_at: string;
  job_id: string | null;
};

export default function ActivityPage() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("sms_messages")
        .select("id,direction,from_number,to_number,body,channel,created_at,job_id")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!mounted) return;
      setMsgs((data ?? []) as Msg[]);
      setLoading(false);
    };
    load();
    const ch = supabase
      .channel("activity-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sms_messages" }, load)
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Activity</h1>
        <p className="text-sm text-muted-foreground">Live WhatsApp & SMS feed across all conversations.</p>
      </div>

      <Card className="border-white/10 bg-white/[0.03] p-3">
        {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
        <div className="divide-y divide-white/5">
          {msgs.map((m) => {
            const inbound = m.direction === "inbound";
            return (
              <div key={m.id} className="flex gap-3 py-2 text-sm">
                <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${inbound ? "bg-sky-500/15 text-sky-300" : "bg-primary/15 text-primary"}`}>
                  {inbound ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{inbound ? m.from_number : m.to_number}</span>
                    <span>· {m.channel}</span>
                    <span className="ml-auto">{fmtRelative(m.created_at)}</span>
                  </div>
                  <div className="truncate text-sm">{m.body || <em className="text-muted-foreground">[media]</em>}</div>
                </div>
              </div>
            );
          })}
          {!loading && msgs.length === 0 && <div className="text-sm text-muted-foreground">No messages.</div>}
        </div>
      </Card>
    </div>
  );
}
