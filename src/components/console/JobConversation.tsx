import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, MessageCircle } from "lucide-react";

type Msg = {
  id: string;
  direction: string;
  from_number: string;
  to_number: string;
  body: string;
  media_urls: string[] | null;
  created_at: string;
  channel: string;
  status: string;
};

export function JobConversation({
  jobId,
  customerPhone,
  jobCreatedAt,
}: {
  jobId: string;
  customerPhone: string;
  jobCreatedAt: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("sms_messages")
        .select("id,direction,from_number,to_number,body,media_urls,created_at,channel,status")
        .eq("job_id", jobId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (cancelled) return;
      if (!error) {
        const seen = new Set<string>();
        const deduped = ((data ?? []) as Msg[]).filter((m) => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });
        setMessages(deduped);
      }
      setLoading(false);
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      });
    };
    load();
    const ch = supabase
      .channel(`job-conv-${jobId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sms_messages" },
        () => load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [jobId, customerPhone, jobCreatedAt]);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03]">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <MessageCircle className="h-3 w-3 text-primary" /> Conversation
        <span className="ml-auto font-normal normal-case text-[10px]">{messages.length} msgs</span>
      </div>
      <div ref={scrollRef} className="scrollbar-thin max-h-72 overflow-y-auto p-3 space-y-2">
        {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!loading && messages.length === 0 && (
          <p className="text-xs text-muted-foreground">No messages yet.</p>
        )}
        {messages.map((m) => {
          const inbound = m.direction === "inbound";
          const failed = !inbound && (m.status || "").toLowerCase().startsWith("failed");
          return (
            <div
              key={m.id}
              className={`flex ${inbound ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg border px-3 py-2 text-sm ${
                  inbound
                    ? "border-transparent bg-white/[0.06] text-foreground"
                    : failed
                      ? "border-destructive/70 bg-destructive/15 text-foreground"
                      : "border-transparent bg-primary/20 text-foreground"
                }`}
              >
                {m.body && <div className="whitespace-pre-wrap break-words">{m.body}</div>}
                {failed && (
                  <div className="mt-2 inline-flex items-center gap-1 rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-destructive">
                    <AlertTriangle className="h-3 w-3" /> Delivery failed
                  </div>
                )}
                {m.media_urls && m.media_urls.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {m.media_urls.map((u, i) => (
                      <a key={i} href={u} target="_blank" rel="noreferrer">
                        <img src={u} alt="" className="h-20 w-20 rounded object-cover" />
                      </a>
                    ))}
                  </div>
                )}
                <div className="mt-1 text-[10px] uppercase tracking-wider opacity-60">
                  {inbound ? "Customer" : "Tyre Fly"} ·{" "}
                  {new Date(m.created_at).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {m.channel ? ` · ${m.channel}` : ""}
                  {failed ? " · failed" : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
