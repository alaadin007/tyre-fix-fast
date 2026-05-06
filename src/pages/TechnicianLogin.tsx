import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useTechnicianAuth";
import { COUNTRIES, buildE164 } from "@/lib/countryCodes";

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{6,14}$/, "Enter a valid mobile number");

export default function TechnicianLogin() {
  const nav = useNavigate();
  const { session, loading } = useAuthSession();
  const [dial, setDial] = useState("44"); // default UK
  const [national, setNational] = useState("");
  const [code, setCode] = useState("");
  const channel = "whatsapp" as const;
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [busy, setBusy] = useState(false);
  const selectedCountry = COUNTRIES.find((country) => country.dial === dial) ?? COUNTRIES[0];

  useEffect(() => {
    if (session && !loading) nav("/technician", { replace: true });
  }, [session, loading, nav]);

  const fullPhone = () => buildE164(dial, national);

  const sendCode = async () => {
    const phone = fullPhone();
    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("tech-otp-send", {
      body: { phone: parsed.data },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Couldn't send code");
      return;
    }
    toast.success((data as any)?.channel === "sms_fallback"
      ? "WhatsApp wasn’t available for this number, so we sent the code by text instead"
      : "Code sent on WhatsApp — check your chats");
    setStep("code");
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("tech-otp-verify", {
      body: {
        phone: fullPhone(),
        code,
        redirect_to: `${window.location.origin}/technician`,
      },
    });
    if (error || (data as any)?.error || !(data as any)?.action_link) {
      setBusy(false);
      toast.error((data as any)?.error || error?.message || "Verification failed");
      return;
    }
    // Follow the magic link to establish session, then land on /technician.
    window.location.href = (data as any).action_link;
  };


  return (
    <main className="min-h-screen bg-[#0B0B0E] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h1 className="text-2xl font-semibold">Technician sign in</h1>
        <p className="mt-1 text-sm text-white/60">
          Sign in with your work phone. We’ll send a one-time code on WhatsApp, or by text if WhatsApp isn’t available.
        </p>

        {step === "phone" ? (
          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="phone">Mobile number</Label>
              <p className="mt-1 text-xs text-white/50">
                Country / region: {selectedCountry.flag} {selectedCountry.name} (+{dial})
              </p>
              <div className="mt-1 flex gap-2">
                <Select value={dial} onValueChange={setDial}>
                  <SelectTrigger aria-label="Country code" className="w-[110px] shrink-0 bg-black/40 border-white/10">
                    <SelectValue placeholder="Country">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-base leading-none">{selectedCountry.flag}</span>
                        <span>+{selectedCountry.dial}</span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-72 bg-popover text-popover-foreground border-border">
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.iso} value={c.dial}>
                        <span className="inline-flex items-center gap-2">
                          <span className="text-base leading-none">{c.flag}</span>
                          <span>+{c.dial}</span>
                          <span className="text-white/50">{c.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="phone"
                  inputMode="tel"
                  value={national}
                  onChange={(e) => setNational(e.target.value)}
                  placeholder="7834 377316"
                  className="flex-1 bg-black/40 border-white/10"
                />
              </div>
              <p className="mt-1 text-xs text-white/40">
                We'll send to +{dial} {national || "…"}
              </p>
            </div>

            <Button
              onClick={sendCode}
              disabled={busy}
              className="w-full bg-[#25D366] hover:bg-[#25D366]/90 text-white"
            >
              {busy ? "Sending…" : "Send code via WhatsApp"}
            </Button>

            <div className="relative my-4 flex items-center">
              <div className="flex-1 border-t border-white/10" />
              <span className="px-3 text-xs uppercase tracking-wider text-white/40">or</span>
              <div className="flex-1 border-t border-white/10" />
            </div>

            <a
              href={`https://wa.me/447447199903?text=${encodeURIComponent("I want to join Tyre Fly as a technician")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-md border border-white/15 bg-white/5 px-4 py-3 text-center text-sm text-white/90 hover:bg-white/10 transition-colors"
            >
              💬 Get onboarded by chat on WhatsApp →
              <span className="block text-xs text-white/50 mt-1">No website needed — our AI walks you through it</span>
            </a>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <div>
              <Label htmlFor="code">WhatsApp code</Label>
              <Input
                id="code"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="bg-black/40 border-white/10"
              />
            </div>
            <Button
              onClick={verify}
              disabled={busy}
              className="w-full bg-[#FF6B1A] hover:bg-[#FF6B1A]/90"
            >
              {busy ? "Verifying…" : "Verify & sign in"}
            </Button>
            <button
              type="button"
              onClick={() => setStep("phone")}
              className="w-full text-sm text-white/60 hover:text-white"
            >
              Use a different number
            </button>
          </div>
        )}

        <p className="mt-6 text-xs text-white/40">
          By signing in you agree to our terms. New here? Just sign in — your
          profile will be created automatically.
        </p>
      </div>
    </main>
  );
}
