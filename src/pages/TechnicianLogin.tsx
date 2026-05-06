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
    const { error } = await supabase.auth.signInWithOtp({
      phone: parsed.data,
      options: { channel },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      channel === "whatsapp"
        ? "Code sent on WhatsApp — check your chats"
        : "Code sent — check your messages",
    );
    setStep("code");
  };

  const verify = async () => {
    if (!/^\d{4,8}$/.test(code)) {
      toast.error("Enter the code you received");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: fullPhone(),
      token: code,
      type: "sms",
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    nav("/technician", { replace: true });
  };


  return (
    <main className="min-h-screen bg-[#0B0B0E] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h1 className="text-2xl font-semibold">Technician sign in</h1>
        <p className="mt-1 text-sm text-white/60">
          Sign in with your work phone — we'll text you a one-time code.
        </p>

        {step === "phone" ? (
          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="phone">Mobile number</Label>
              <div className="mt-1 flex gap-2">
                <Select value={dial} onValueChange={setDial}>
                  <SelectTrigger className="w-[130px] bg-black/40 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.iso} value={c.dial}>
                        {c.flag} {c.iso} +{c.dial}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="phone"
                  inputMode="tel"
                  value={national}
                  onChange={(e) => setNational(e.target.value)}
                  placeholder="07834 377316"
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
