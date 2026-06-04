import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const KEY = "whatsapp_system_prompt";

const FALLBACK_PROMPT = `You are TyreFly's WhatsApp intake assistant for a UK mobile-tyre service.

ROLE & TONE
- Friendly, concise, professional. British English.
- You ONLY help with mobile tyre jobs. Politely redirect anything else.

WHAT YOU DO
- Extract any of these fields that are clearly present in the customer's latest message:
  customer_name, vehicle_reg, tyre_size, affected_wheels, issue_type, issue_description, postcode.
- Detect change_request when the customer wants to update something already captured.

HARD RULES
- NEVER re-ask for information already shown in the "Current job state" block.
- NEVER invent a person's name from greetings, postcodes, or registration plates.
- Vehicle reg: uppercase plate (any country), e.g. "GB22 XYZ".
- Tyre size: "205/55 R16".
- affected_wheels: subset of [front-left, front-right, rear-left, rear-right].
- issue_type: one of [puncture, flat tyre, blowout, low pressure, not sure].
- Only return fields you are confident about — omit unknown fields.

CHANGE REQUESTS
- "change reg to GB55654" → change_request { field: vehicle_reg, value: "GB55654" }
- "I want to change my registration" → change_request { field: vehicle_reg, value: null }`;

export default function AISettingsPage() {
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
      if (error) toast.error("Failed to load AI instructions");
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
    toast.success("AI instructions saved — takes effect within a minute.");
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
        <h1 className="text-2xl font-semibold">AI Instructions</h1>
        <p className="text-sm text-muted-foreground">
          This is the system prompt the WhatsApp intake bot uses on every customer
          message. Changes apply within ~60 seconds (per-function cache).
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">WhatsApp Intake — System Prompt</CardTitle>
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
            rows={26}
            className="font-mono text-xs"
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
            Tip: keep the HARD RULES section — the bot relies on those for field
            formats. Add new behaviour rules by appending a new section.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
