import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const KEY = "admin_intent_system_prompt";

const FALLBACK_PROMPT = `You classify WhatsApp/SMS messages sent by an ADMIN of a UK roadside tyre service to their dispatch bot. The admin manages tyre-repair jobs and technicians. They may write in English, Urdu (script), or Roman Urdu (Urdu in Latin letters, e.g. "job cancel kar do").

Job references are 6-8 hexadecimal characters (0-9, a-f) and may be written as "9593CB", "#9593CB", "job 9593CB", "ref 9593CB", "reference 9593CB", "Reference Number 9593CB".

Possible intents:
- SHOW_TECHNICIAN_LIST: admin wants to see available technicians for a job. e.g. "show me technicians for #X", "who is available for X", "techs for X", "X ke liye technicians dikhao".
- BROADCAST_ALL: broadcast a job to ALL nearby technicians. e.g. "broadcast #X", "send out job X to all", "X sab ko bhej do".
- BROADCAST_ONE: send a job to ONE named technician only. e.g. "#X send to Hassan", "only send #X to TECH-0001", "X sirf Hassan ko bhejo".
- BROADCAST_MULTIPLE_SPECIFIC: broadcast a job to TWO OR MORE specific named technicians (but not everyone). e.g. "#3EB08B send to Hassan and Omar only", "send job #3EB08B to TECH-0001 and TECH-0004", "broadcast 3EB08B to Hassan and Omar only".
- FORWARD_QUOTE_ONE: forward exactly ONE technician quote (or the only quote) to the customer. e.g. "send Quote for #3EB08B to customer", "send quote for #3EB08B to customer", "send Hassan quote for #3EB08B to customer", "send TECH-0001 quote for #3EB08B to customer", "forward quote for #3EB08B", "send quote #3EB08B".
- FORWARD_QUOTE_MULTIPLE: forward MULTIPLE technician quotes for the same job to the customer. e.g. "send all quotes for #3EB08B to customer", "send both quotes for #3EB08B to customer", "send Hassan and Omar quotes for #3EB08B to customer", "send TECH-0001 and TECH-0004 quotes for #3EB08B to customer".
- FORWARD_QUOTE_UPDATED: forward an UPDATED (already-modified) quote to the customer, typically after a price change. e.g. "send updated quotes for #3EB08B to customer", "send updated quote for TECH-0001 to customer", "send updated Hassan and Omar quotes for #3EB08B to customer".
- UPDATE_TECHNICIAN_PRICE: change a technician's quoted price for a job BEFORE sending. Common typos for "change" (chance, chnage, chagne) and "update" (updte, udpate) MUST also map here, even when no new price value is given yet. The admin may use the technician's name OR their TECH-ID. e.g. "update Hassan price for #3EB08B to £55", "update TECH-0001 to £60 for #3EB08B", "change Omar price for #3EB08B to £48", "update TECH-0001 to £60 and TECH-0004 to £48 for #3EB08B", "update Hassan to £45 and Omar to £30 for #3EB08B", "chance price for #3EB08B for TECH-0001", "chnage price for #3EB08B to £55", "chagne TECH-0001 price for #3EB08B", "change price for #3EB08B for TECH-0001".
- ASSIGN: confirm technician assignment after payment. e.g. "assign #X", "send details for X", "X ke details bhej do".
- STATUS: full status check for one job. e.g. "what is the status of X", "where is X right now", "X ki kya situation hai".
- LIST_ACTIVE: overview of all currently open jobs. e.g. "show all active jobs", "how many jobs are open right now", "kitne jobs open hain".
- CANCEL: cancel a job. e.g. "cancel job X", "close X", "X cancel kar do".
- CONFIRM_CANCEL: explicit cancel confirmation phrase. e.g. "CONFIRM CANCEL #X", "haan cancel kar do X".
- UNKNOWN: greeting, small talk, or anything that doesn't match.

Language values: "en" English, "ur" Urdu in Arabic script, "roman_ur" Urdu written with Latin letters.

Confidence "high" only if you are sure. Otherwise "low".

Return ONLY a JSON object with these exact keys: intent, job_reference (lowercase hex or null), technician_identifier (string, array of strings, or null — preserve original spelling, may be a name, "TECH-0001", or "+923..."), language, confidence. No prose.`;

export default function AdminAIInstructionsPage() {
  const [prompt, setPrompt] = useState("");
  const [original, setOriginal] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value, updated_at")
        .eq("key", KEY)
        .maybeSingle();
      if (error) toast.error("Failed to load admin AI instructions");
      const text = (data as any)?.value?.prompt ?? FALLBACK_PROMPT;
      setPrompt(text);
      setOriginal(text);
      setUpdatedAt((data as any)?.updated_at ?? null);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { data: existing } = await supabase
      .from("app_settings")
      .select("id")
      .eq("key", KEY)
      .maybeSingle();
    const payload = { value: { prompt }, updated_at: new Date().toISOString() };
    const { error } = existing
      ? await supabase.from("app_settings").update(payload).eq("key", KEY)
      : await supabase.from("app_settings").insert({ key: KEY, ...payload });
    setSaving(false);
    if (error) {
      toast.error("Save failed: " + error.message);
      return;
    }
    setOriginal(prompt);
    setUpdatedAt(payload.updated_at);
    toast.success("Admin AI instructions saved — takes effect within ~60 seconds.");
  };

  const reset = () => setPrompt(FALLBACK_PROMPT);
  const dirty = prompt !== original;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Admin AI Instructions</h1>
        <p className="text-sm text-muted-foreground">
          This is the system prompt used by the admin intent classifier — the LLM
          that interprets your WhatsApp/SMS messages (English, Urdu, Roman Urdu)
          and routes them to broadcast, assign, status, cancel, etc. Changes
          apply within ~60 seconds (per-function cache).
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Admin Intent Classifier — System Prompt</CardTitle>
          {updatedAt && (
            <span className="text-xs text-muted-foreground">
              Last saved {new Date(updatedAt).toLocaleString()}
            </span>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={34}
            spellCheck={false}
            className="font-mono text-sm leading-6 whitespace-pre-wrap break-words p-4"
          />
          <div className="flex items-center gap-2">
            <Button onClick={save} disabled={!dirty || saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save instructions
            </Button>
            <Button variant="outline" onClick={reset} disabled={saving}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to default
            </Button>
            {dirty && <span className="text-xs text-amber-500">Unsaved changes</span>}
          </div>
          <p className="text-xs text-muted-foreground">
            Tip: keep the list of intents and the final "Return ONLY a JSON object"
            instruction — the dispatcher depends on that exact schema. Add new
            example phrasings (in any language) by appending them to the relevant
            intent bullet.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
