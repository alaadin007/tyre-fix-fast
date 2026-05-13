import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useTechnicianAuth";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  whatsapp: z.string().trim().min(7, "WhatsApp number is required").max(20),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  vehicle: z.string().trim().max(100).optional().or(z.literal("")),
  service_postcodes: z.string().trim().min(1, "Add at least one postcode area"),
  travel_radius_miles: z.coerce.number().int().min(1).max(200),
  skills: z.string().trim().min(1, "Pick at least one skill"),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

const SKILL_OPTIONS = [
  "puncture",
  "blowout",
  "locked-wheel",
  "run-flat",
  "alloy-repair",
  "tyre-change",
  "mobile-fit",
];

export default function TechnicianOnboarding() {
  const nav = useNavigate();
  const { user, loading } = useAuthSession();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    whatsapp: "",
    email: "",
    vehicle: "",
    service_postcodes: "",
    travel_radius_miles: "15",
    notes: "",
  });
  const [skills, setSkills] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) nav("/technician/login", { replace: true });
  }, [user, loading, nav]);

  useEffect(() => {
    // If profile already exists, go to dashboard
    if (!user) return;
    supabase
      .from("technicians")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) nav("/technician", { replace: true });
      });
  }, [user, nav]);

  const submit = async () => {
    if (!user) return;
    const parsed = schema.safeParse({ ...form, skills: skills.join(",") });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("technicians").insert({
      user_id: user.id,
      name: parsed.data.name,
      phone: user.phone ? `+${user.phone.replace(/^\+/, "")}` : "",
      email: parsed.data.email || null,
      whatsapp: parsed.data.whatsapp || null,
      vehicle: parsed.data.vehicle || null,
      service_postcodes: parsed.data.service_postcodes
        .split(",")
        .map((p) => p.trim().toUpperCase())
        .filter(Boolean),
      travel_radius_miles: parsed.data.travel_radius_miles,
      skills,
      notes: parsed.data.notes || null,
      active: false,
      approval_status: "pending",
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile created — pending approval");
    nav("/technician", { replace: true });
  };

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const toggleSkill = (s: string) =>
    setSkills((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  return (
    <main className="min-h-screen bg-[#0B0B0E] text-white px-4 py-8">
      <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <h1 className="text-2xl font-semibold">Welcome — let's set up your profile</h1>
        <p className="mt-1 text-sm text-white/60">
          Once approved, you'll start receiving job dispatches that match your area and skills.
        </p>

        <div className="mt-6 grid gap-4">
          <div>
            <Label htmlFor="name">Full name *</Label>
            <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} className="bg-black/40 border-white/10" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="+44…" className="bg-black/40 border-white/10" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="bg-black/40 border-white/10" />
            </div>
          </div>
          <div>
            <Label htmlFor="vehicle">Vehicle / mobile rig</Label>
            <Input id="vehicle" value={form.vehicle} onChange={(e) => set("vehicle", e.target.value)} placeholder="e.g. Ford Transit mobile fit van" className="bg-black/40 border-white/10" />
          </div>
          <div>
            <Label htmlFor="service_postcodes">Service postcode areas (comma separated) *</Label>
            <Input id="service_postcodes" value={form.service_postcodes} onChange={(e) => set("service_postcodes", e.target.value)} placeholder="SW1, SW2, SE1" className="bg-black/40 border-white/10" />
          </div>
          <div>
            <Label htmlFor="travel_radius_miles">Max travel radius (miles) *</Label>
            <Input id="travel_radius_miles" type="number" min={1} max={200} value={form.travel_radius_miles} onChange={(e) => set("travel_radius_miles", e.target.value)} className="bg-black/40 border-white/10" />
          </div>
          <div>
            <Label>Skills *</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {SKILL_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSkill(s)}
                  className={`rounded-full border px-3 py-1 text-sm transition ${
                    skills.includes(s)
                      ? "border-[#FF6B1A] bg-[#FF6B1A]/20 text-white"
                      : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Notes for dispatch</Label>
            <Textarea id="notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} className="bg-black/40 border-white/10" />
          </div>

          <Button onClick={submit} disabled={busy} className="bg-[#FF6B1A] hover:bg-[#FF6B1A]/90">
            {busy ? "Saving…" : "Submit profile"}
          </Button>
          <p className="text-xs text-white/40">
            You'll add equipment photos and insurance documents next on your dashboard.
          </p>
        </div>
      </div>
    </main>
  );
}
