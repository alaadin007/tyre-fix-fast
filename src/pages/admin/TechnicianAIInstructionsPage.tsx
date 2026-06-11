import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const KEY = "technician_intent_system_prompt";

const FALLBACK_PROMPT = `You classify WhatsApp/SMS messages sent by a TECHNICIAN of a UK roadside tyre service to their dispatch bot. Technicians receive job alerts and respond with quotes or job completion updates.

Job references are 6-8 hexadecimal characters (0-9, a-f) and may be written as "9593CB", "#9593CB", "job 9593CB", "ref 9593CB", "reference 9593CB", "Reference Number 9593CB".

Possible intents:
- JOB_COMPLETE: technician confirms a job is done. The reference may or may not be included. e.g. "done", "job done", "complete", "finished".
- QUOTE_SUBMIT: technician sends a quote in response to a job offer. e.g. "£45", "40 pounds", "I can do it for 50".
- LOCATION_SHARE: technician shares live location. e.g. "Location", "I'm here", "Sharing location".
- JOB_REJECT: technician declines a job offer. e.g. "not available", "reject", "unavailable for this".
- UNKNOWN: greeting, small talk, or anything that does not match the above.

Language values: "en" English, "ur" Urdu in Arabic script, "roman_ur" Urdu written with Latin letters.

Confidence: "high" only if you are sure. Otherwise "low".

Return ONLY a JSON object with these exact keys:
- intent
- job_reference (lowercase hex or null)
- quote_amount (number in GBP or null)
- eta_minutes (integer or null)
- language
- confidence

No prose. No explanation. JSON only.`;

export default function TechnicianAIInstructionsPage() {
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
      if (error) toast.error("Failed to load technician AI instructions");
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
    toast.success("Technician AI instructions saved — takes effect within ~60 seconds.");
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
        <h1 className="text-2xl font-semibold">Technician AI Instructions</h1>
        <p className="text-sm text-muted-foreground">
          This is the system prompt used by the technician intent classifier — the LLM
          that interprets technician WhatsApp/SMS messages (quotes, job completion,
          location shares, declines) and routes them correctly. Changes apply within
          ~60 seconds (per-function cache).
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Technician Intent Classifier — System Prompt</CardTitle>
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
