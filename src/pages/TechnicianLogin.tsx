import { useState } from "react";
import { Check, Circle, Loader2, MessageSquare, RefreshCw } from "lucide-react";
import { toWaNumber } from "@/lib/whatsapp";
import { supabase } from "@/integrations/supabase/client";

const SUPPORT_WA = "447447199903";

type TechRow = {
  id: string;
  name: string | null;
  phone: string;
  approval_status: string;
  service_postcodes: string[] | null;
  vehicle: string | null;
  travel_radius_miles: number | null;
  weekly_schedule: Record<string, unknown> | null;
  last_lat: number | null;
  last_lng: number | null;
  equipment_photo_urls: string[] | null;
  insurance_doc_url: string | null;
  id_doc_url: string | null;
  public_liability_doc_url: string | null;
};

type Step = {
  key: string;
  label: string;
  done: boolean;
  prompt: string; // what to send on WhatsApp to complete this step
  detail?: string; // value already captured (shown when done)
};

function buildSteps(t: TechRow): Step[] {
  const hasName = !!t.name && t.name !== "Pending applicant";
  const hasArea = (t.service_postcodes?.length ?? 0) > 0;
  const hasVehicle = !!t.vehicle;
  const hasRadius = !!t.travel_radius_miles && t.travel_radius_miles > 0;
  const hasSchedule = !!t.weekly_schedule && Object.keys(t.weekly_schedule).length > 0;
  const hasPin = t.last_lat !== null && t.last_lng !== null;
  const hasEquipment = (t.equipment_photo_urls?.length ?? 0) > 0;
  const hasInsurance = !!t.insurance_doc_url;
  const hasId = !!t.id_doc_url;
  const hasPL = !!t.public_liability_doc_url;

  return [
    {
      key: "name",
      label: "Full name",
      done: hasName,
      prompt: "My full name is …",
      detail: hasName ? t.name! : undefined,
    },
    {
      key: "area",
      label: "Service area (postcodes / city)",
      done: hasArea,
      prompt: "I cover these postcodes / areas: …",
      detail: hasArea ? (t.service_postcodes ?? []).join(", ") : undefined,
    },
    {
      key: "vehicle",
      label: "Vehicle (make, model, year)",
      done: hasVehicle,
      prompt: "My van is a … (e.g. Ford Transit 2020)",
      detail: hasVehicle ? t.vehicle! : undefined,
    },
    {
      key: "radius",
      label: "Travel radius",
      done: hasRadius,
      prompt: "I can travel up to … miles",
      detail: hasRadius ? `${t.travel_radius_miles} miles` : undefined,
    },
    {
      key: "schedule",
      label: "Weekly availability",
      done: hasSchedule,
      prompt: "My weekly hours: Mon 9-6, Tue 9-6, Sat off …",
      detail: hasSchedule ? "Saved" : undefined,
    },
    {
      key: "pin",
      label: "Live location pin 📍",
      done: hasPin,
      prompt: "Tap WhatsApp 📎 → Location → Send your current location",
    },
    {
      key: "equipment",
      label: "Equipment photo",
      done: hasEquipment,
      prompt: "Send a photo of your tyre fitting equipment",
    },
    {
      key: "insurance",
      label: "Insurance document",
      done: hasInsurance,
      prompt: "Send a photo of your motor trade / insurance certificate",
    },
    {
      key: "id",
      label: "Photo ID",
      done: hasId,
      prompt: "Send a photo of your driving licence or passport",
    },
    {
      key: "pl",
      label: "Public liability certificate",
      done: hasPL,
      prompt: "Send a photo of your public liability certificate",
    },
  ];
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  intake: { label: "Onboarding in progress", className: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  pending: { label: "Awaiting admin approval", className: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  approved: { label: "Approved ✓", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  rejected: { label: "Rejected — please contact us", className: "bg-red-500/15 text-red-300 border-red-500/30" },
};

export default function TechnicianLogin() {
  const introMsg =
    "Hi Tyre Fly — I'd like to sign up as a technician. Please guide me through the registration.";
  const introWaHref = `https://wa.me/${toWaNumber(SUPPORT_WA)}?text=${encodeURIComponent(introMsg)}`;

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [tech, setTech] = useState<TechRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const lookup = async () => {
    setError(null);
    setSearched(true);
    const wa = toWaNumber(phone);
    if (!wa || wa.length < 8) {
      setError("Enter your WhatsApp number including country code.");
      return;
    }
    setLoading(true);
    // Try a few common formats the inbound webhook may store
    const candidates = Array.from(
      new Set([`+${wa}`, wa, `whatsapp:+${wa}`])
    );
    const { data, error: qErr } = await supabase
      .from("technicians")
      .select(
        "id,name,phone,approval_status,service_postcodes,vehicle,travel_radius_miles,weekly_schedule,last_lat,last_lng,equipment_photo_urls,insurance_doc_url,id_doc_url,public_liability_doc_url"
      )
      .in("phone", candidates)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setLoading(false);
    if (qErr) {
      setError("Couldn't load progress. Try again in a moment.");
      return;
    }
    setTech((data as TechRow | null) ?? null);
  };

  const steps = tech ? buildSteps(tech) : [];
  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const pct = total ? Math.round((completed / total) * 100) : 0;
  const nextStep = steps.find((s) => !s.done);
  const nextWaHref = nextStep
    ? `https://wa.me/${toWaNumber(SUPPORT_WA)}?text=${encodeURIComponent(nextStep.prompt)}`
    : `https://wa.me/${toWaNumber(SUPPORT_WA)}`;

  const badge = tech ? STATUS_BADGE[tech.approval_status] ?? null : null;

  return (
    <main className="min-h-screen bg-[#0B0B0E] text-white px-4 py-10">
      <div className="mx-auto w-full max-w-xl space-y-6">
        {/* Sign up card */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h1 className="text-2xl font-semibold">Become a Tyre Fly technician</h1>
          <p className="mt-2 text-sm text-white/60">
            Sign up takes 2 minutes — all on WhatsApp. Our AI asks for your
            name, service area, vehicle, schedule and docs, then admin approves
            your profile.
          </p>
          <a
            href={introWaHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-4 font-semibold text-black shadow-lg transition-transform active:scale-[0.98] hover:scale-[1.01]"
            style={{ boxShadow: "0 10px 30px -10px rgba(37,211,102,0.5)" }}
          >
            <MessageSquare className="h-5 w-5" strokeWidth={2.5} />
            Start sign-up on WhatsApp
          </a>
        </section>

        {/* Progress tracker */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="text-lg font-semibold">Check your sign-up progress</h2>
          <p className="mt-1 text-sm text-white/60">
            Enter the WhatsApp number you used so we can show what's done and
            what to send next.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              lookup();
            }}
            className="mt-4 flex gap-2"
          >
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+44 7447 184489"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#FF6B1A]"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : tech ? (
                <RefreshCw className="h-4 w-4" />
              ) : null}
              {tech ? "Refresh" : "Check"}
            </button>
          </form>

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

          {searched && !error && !loading && !tech && (
            <p className="mt-4 text-sm text-white/60">
              We don't have a sign-up for that number yet. Tap{" "}
              <span className="text-white">Start sign-up on WhatsApp</span> above
              to begin.
            </p>
          )}

          {tech && (
            <div className="mt-5 space-y-5">
              {/* Header: status + progress bar */}
              <div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm">
                    <span className="text-white/60">Hello </span>
                    <span className="font-semibold">
                      {tech.name && tech.name !== "Pending applicant"
                        ? tech.name
                        : "there"}
                    </span>
                  </p>
                  {badge && (
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-[#25D366] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/70">
                    {completed}/{total}
                  </span>
                </div>
              </div>

              {/* Next-step CTA */}
              {nextStep && tech.approval_status !== "approved" && (
                <div className="rounded-xl border border-[#FF6B1A]/30 bg-[#FF6B1A]/10 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#FF6B1A]">
                    Next step
                  </p>
                  <p className="mt-1 text-sm font-semibold">{nextStep.label}</p>
                  <p className="mt-1 text-sm text-white/70">
                    Send on WhatsApp: <span className="text-white">"{nextStep.prompt}"</span>
                  </p>
                  <a
                    href={nextWaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-black"
                  >
                    <MessageSquare className="h-4 w-4" strokeWidth={2.5} />
                    Send on WhatsApp
                  </a>
                </div>
              )}

              {tech.approval_status === "approved" && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
                  You're approved 🎉 Jobs in your area will arrive on WhatsApp.
                </div>
              )}

              {/* Checklist */}
              <ul className="space-y-2">
                {steps.map((s) => (
                  <li
                    key={s.key}
                    className={`flex items-start gap-3 rounded-lg border p-3 ${
                      s.done
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : "border-white/10 bg-white/[0.02]"
                    }`}
                  >
                    {s.done ? (
                      <Check
                        className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400"
                        strokeWidth={3}
                      />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 shrink-0 text-white/30" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium ${
                          s.done ? "text-white" : "text-white/80"
                        }`}
                      >
                        {s.label}
                      </p>
                      {s.done && s.detail ? (
                        <p className="mt-0.5 truncate text-xs text-white/50">
                          {s.detail}
                        </p>
                      ) : !s.done ? (
                        <p className="mt-0.5 text-xs text-white/50">
                          Send: "{s.prompt}"
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <p className="text-center text-xs text-white/40">
          By continuing you agree to our terms.
        </p>
      </div>
    </main>
  );
}
