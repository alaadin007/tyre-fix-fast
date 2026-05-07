import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle } from "lucide-react";

type Msg = {
  id: string;
  direction: string;
  from_number: string;
  to_number: string;
  body: string;
  media_urls: string[] | null;
  created_at: string;
  channel: string;
};

export function JobConversation({
  jobId,
  customerPhone,
}: {
  jobId: string;
  customerPhone: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // Match by job_id OR by customer phone (intake messages may not yet have job_id)
      const phone = (customerPhone || "").replace(/\s+/g, "");
      const orFilter = phone
        ? `job_id.eq.${jobId},from_number.eq.${phone},to_number.eq.${phone}`
        : `job_id.eq.${jobId}`;
      const { data, error } = await supabase
        .from("sms_messages")
        .select("id,direction,from_number,to_number,body,media_urls,created_at,channel")
        .or(orFilter)
        .order("created_at", { ascending: true })
        .limit(200);
      if (cancelled) return;
      if (!error) setMessages((data ?? []) as Msg[]);
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
        { event: "INSERT", schema: "public", table: "sms_messages" },
        () => load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [jobId, customerPhone]);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03]">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <MessageCircle className="h-3 w-3 text-primary" /> Conversation
        <span className="ml-auto font-normal normal-case text-[10px]">{messages.length} msgs</span>
      </div>
      <div ref={scrollRef} className="max-h-72 overflow-y-auto p-3 space-y-2">
        {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
        {!loading && messages.length === 0 && (
          <p className="text-xs text-muted-foreground">No messages yet.</p>
        )}
        {messages.map((m) => {
          const inbound = m.direction === "inbound";
          return (
            <div
              key={m.id}
              className={`flex ${inbound ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  inbound
                    ? "bg-white/[0.06] text-foreground"
                    : "bg-primary/20 text-foreground"
                }`}
              >
                {m.body && <div className="whitespace-pre-wrap break-words">{m.body}</div>}
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
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
