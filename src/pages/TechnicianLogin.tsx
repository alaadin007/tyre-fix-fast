import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthSession } from "@/hooks/useTechnicianAuth";
import { COUNTRIES, buildE164 } from "@/lib/countryCodes";
import { toWaNumber } from "@/lib/whatsapp";

const SUPPORT_WA = "447447199903"; // Tyre Fly support WhatsApp

export default function TechnicianLogin() {
  const nav = useNavigate();
  const { session, loading } = useAuthSession();
  const [dial, setDial] = useState("44");
  const [national, setNational] = useState("");
  const selectedCountry =
    COUNTRIES.find((c) => c.dial === dial) ?? COUNTRIES[0];

  useEffect(() => {
    if (session && !loading) nav("/technician", { replace: true });
  }, [session, loading, nav]);

  const myNumber = national ? buildE164(dial, national) : "";
  const message = myNumber
    ? `Hi Tyre Fly — I want to join as a technician. My number is ${myNumber}.`
    : `Hi Tyre Fly — I want to join as a technician.`;
  const waHref = `https://wa.me/${toWaNumber(SUPPORT_WA)}?text=${encodeURIComponent(message)}`;

  return (
    <main className="min-h-screen bg-[#0B0B0E] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h1 className="text-2xl font-semibold">Technician sign in</h1>
        <p className="mt-1 text-sm text-white/60">
          Tap below to message us on WhatsApp. Sending the message confirms your
          number — no codes, no passwords.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="phone">Your mobile (optional)</Label>
            <p className="mt-1 text-xs text-white/50">
              {selectedCountry.flag} {selectedCountry.name} (+{dial})
            </p>
            <div className="mt-1 flex gap-2">
              <Select value={dial} onValueChange={setDial}>
                <SelectTrigger
                  aria-label="Country code"
                  className="w-[120px] shrink-0 bg-black/40 border-white/10"
                >
                  <SelectValue>
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <span className="text-base leading-none">
                        {selectedCountry.flag}
                      </span>
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
          </div>

          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-4 font-semibold text-black shadow-lg transition-transform active:scale-[0.98] hover:scale-[1.01]"
            style={{ boxShadow: "0 10px 30px -10px rgba(37,211,102,0.5)" }}
          >
            <MessageSquare className="h-5 w-5" strokeWidth={2.5} />
            Continue on WhatsApp
          </a>

          <p className="text-center text-xs text-white/40">
            Our AI will guide you through onboarding right in the chat.
          </p>
        </div>

        <p className="mt-6 text-xs text-white/40">
          By continuing you agree to our terms. Once your profile is approved
          you'll get a sign-in link by WhatsApp.
        </p>
      </div>
    </main>
  );
}
