import { useRef, useState } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-chat`;

const SUGGESTIONS = [
  "Summarise today's inquiries",
  "Which technician should take the next job in W12?",
  "Draft an SMS for an unrepairable sidewall rupture",
  "What's a fair price for a runflat replacement at 11pm?",
];

export function AdminAIChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollDown = () =>
    requestAnimationFrame(() => {
      const el = scrollRef.current?.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement | null;
      if (el) el.scrollTop = el.scrollHeight;
    });

  const send = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || loading) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: value };
    const next = [...messages, userMsg];
    setMessages(next);
    setLoading(true);
    scrollDown();

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next }),
      });

      if (resp.status === 429) {
        toast.error("Rate limit hit, please wait a moment.");
        setLoading(false);
        return;
      }
      if (resp.status === 402) {
        toast.error("AI credits exhausted — top up in workspace settings.");
        setLoading(false);
        return;
      }
      if (!resp.ok || !resp.body) {
        toast.error("Couldn't reach the AI right now.");
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantSoFar = "";
      let streamDone = false;

      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
        scrollDown();
      };

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, nl);
          textBuffer = textBuffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsert(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Chat failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1 pr-3" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 text-white/90">
              <Sparkles className="h-4 w-4 text-[hsl(var(--accent))]" />
              <p className="text-sm font-medium">Ops co-pilot</p>
            </div>
            <p className="text-xs text-white/70">
              Ask about pricing, dispatch, customer scripts, or anything operational.
            </p>
            <div className="space-y-1.5 pt-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-white/85 transition hover:border-[hsl(var(--accent))]/50 hover:bg-white/10"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-6 rounded-2xl rounded-tr-sm bg-[hsl(var(--accent))] px-3 py-2 text-sm text-white shadow-accent"
                    : "mr-6 rounded-2xl rounded-tl-sm border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/95"
                }
              >
                {m.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                    <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role === "user" && (
              <div className="mr-6 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
                <Loader2 className="h-3 w-3 animate-spin" /> thinking…
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <div className="mt-3 flex items-end gap-2 rounded-xl border border-white/10 bg-white/5 p-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Ask anything… (Enter to send)"
          className="min-h-9 resize-none border-0 bg-transparent text-sm text-white placeholder:text-white/40 focus-visible:ring-0"
        />
        <Button
          size="icon"
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="h-9 w-9 shrink-0 bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-glow))]"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
