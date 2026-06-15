import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const KEY = "technician_intent_system_prompt";
// Bump this whenever FALLBACK_PROMPT changes so the new default
// auto-applies to the live DB without needing "Reset to default".
const FALLBACK_VERSION = 2;

const FALLBACK_PROMPT = `You classify WhatsApp/SMS messages sent by a TECHNICIAN of a UK roadside tyre service to their dispatch bot. Technicians receive job alerts and respond with quotes or job completion updates. A technician may have MULTIPLE active jobs at the same time, so a missing job reference is meaningful — never silently guess.

Job references are 6-8 hexadecimal characters (0-9, a-f) and may be written as "9593CB", "#9593CB", "job 9593CB", "ref 9593CB", "reference 9593CB", "Reference Number 9593CB".

Possible intents:
- JOB_COMPLETE: ANY message containing a "done"-style signal (case-insensitive), with or without punctuation, with or without a job reference — ALWAYS maps to JOB_COMPLETE. Never classify as UNKNOWN.
  Common forms: "Done", "done", "DONE", "Done!", "Done.", "Done E2C9FE", "Done #E2C9FE", "finished", "complete", "completed", "job done", "kar diya", "kardia", "mukammal", "ho gaya", "hogaya", "khatam".
  If a reference is present → extract as job_reference (lowercase hex). If no reference → job_reference: null. needs_reference is always false for JOB_COMPLETE (the backend disambiguates by counting the technician's active jobs).
- QUOTE_SUBMIT: technician replies with a price and/or ETA in response to a job offer. e.g. "£45", "40 pounds", "I can do it for 50", "£85, 25 mins", "£60 ETA 30".
  If a valid job reference IS included → set needs_reference: false and extract job_reference.
  If NO job reference is included → set needs_reference: true and job_reference: null. Do NOT reject and do NOT classify as UNKNOWN — the backend will ask the technician to resend with a reference.
- LOCATION_SHARE: technician shares live location. e.g. "Location", "I'm here", "Sharing location".
- JOB_REJECT: technician declines a job offer. e.g. "not available", "reject", "unavailable for this", "pass".
- UNKNOWN: greeting, small talk, or anything that does not match the above.

Language values: "en" English, "ur" Urdu in Arabic script, "roman_ur" Urdu written with Latin letters.

Confidence: "high" only if you are sure. Otherwise "low".

Return ONLY a JSON object with these exact keys:
- intent
- job_reference (lowercase hex or null)
- quote_amount (number in GBP or null)
- eta_minutes (integer or null)
- needs_reference (boolean — true only for QUOTE_SUBMIT without a reference, false otherwise)
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

      const storedVersion = (data as any)?.value?.version ?? 0;
      const storedPrompt = (data as any)?.value?.prompt as string | undefined;

      if (storedVersion < FALLBACK_VERSION) {
        const payload = {
          value: { prompt: FALLBACK_PROMPT, version: FALLBACK_VERSION },
          updated_at: new Date().toISOString(),
        };
        if (data) {
          await supabase.from("app_settings").update(payload).eq("key", KEY);
        } else {
          await supabase.from("app_settings").insert({ key: KEY, ...payload });
        }
        setPrompt(FALLBACK_PROMPT);
        setOriginal(FALLBACK_PROMPT);
        setUpdatedAt(payload.updated_at);
        if (storedPrompt) {
          toast.success("Technician AI instructions updated to latest default (v" + FALLBACK_VERSION + ").");
        }
      } else {
        const text = storedPrompt ?? FALLBACK_PROMPT;
        setPrompt(text);
        setOriginal(text);
        setUpdatedAt((data as any)?.updated_at ?? null);
      }
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
    const payload = {
      value: { prompt, version: FALLBACK_VERSION },
      updated_at: new Date().toISOString(),
    };
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
