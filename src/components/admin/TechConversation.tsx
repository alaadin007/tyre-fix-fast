import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowDownLeft, ArrowUpRight, Loader2 } from "lucide-react";

type Msg = {
  id: string;
  created_at: string;
  direction: string;
  from_number: string;
  to_number: string;
  body: string;
  channel: string;
  num_media: number;
  media_urls: string[];
};

function digits(p: string) {
  return (p || "").replace(/^whatsapp:/, "").replace(/[^\d]/g, "");
}

export function TechConversation({ phone }: { phone: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const d = digits(phone);
    if (!d) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      // Match last 9 digits to be tolerant of +/whatsapp: prefixes
      const tail = d.slice(-9);
      const { data } = await supabase
        .from("sms_messages")
        .select("*")
        .or(`from_number.ilike.%${tail}%,to_number.ilike.%${tail}%`)
        .order("created_at", { ascending: true })
        .limit(200);
      if (!cancelled) {
        setMsgs((data || []) as Msg[]);
        setLoading(false);
      }
    };
    void load();
    const ch = supabase
      .channel(`conv-${d}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sms_messages" },
        (payload) => {
          const m = payload.new as Msg;
          if (
            digits(m.from_number).endsWith(d.slice(-9)) ||
            digits(m.to_number).endsWith(d.slice(-9))
          ) {
            setMsgs((prev) => [...prev, m]);
          }
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [phone]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading conversation…
      </div>
    );
  }

  if (!msgs.length) {
    return (
      <p className="p-3 text-xs text-muted-foreground">
        No messages exchanged yet.
      </p>
    );
  }

  return (
    <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg bg-muted/30 p-3">
      {msgs.map((m) => {
        const inbound = m.direction === "inbound" || m.direction === "in";
        return (
          <div
            key={m.id}
            className={`flex ${inbound ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                inbound
                  ? "rounded-bl-sm bg-white text-foreground"
                  : "rounded-br-sm bg-emerald-500 text-white"
              }`}
            >
              <div className="flex items-center gap-1 text-[10px] opacity-70">
                {inbound ? (
                  <ArrowDownLeft className="h-2.5 w-2.5" />
                ) : (
                  <ArrowUpRight className="h-2.5 w-2.5" />
                )}
                <span className="uppercase">{m.channel}</span>
                <span>·</span>
                <span>{new Date(m.created_at).toLocaleString()}</span>
              </div>
              {m.body && (
                <p className="mt-0.5 whitespace-pre-wrap break-words">
                  {m.body}
                </p>
              )}
              {m.num_media > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {(m.media_urls || []).map((u, i) => (
                    <a
                      key={i}
                      href={u}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] underline"
                    >
                      📎 media {i + 1}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
