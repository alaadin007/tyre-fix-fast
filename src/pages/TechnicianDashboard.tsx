import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/useTechnicianAuth";
import { WeeklyScheduleEditor, type WeeklySchedule } from "@/components/technician/WeeklyScheduleEditor";
import { PhotosUploader } from "@/components/technician/PhotosUploader";
import { DocumentsUploader } from "@/components/technician/DocumentsUploader";

const SKILL_OPTIONS = ["puncture", "blowout", "locked-wheel", "run-flat", "alloy-repair", "tyre-change", "mobile-fit"];

type Tech = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  whatsapp: string | null;
  vehicle: string | null;
  service_postcodes: string[];
  travel_radius_miles: number | null;
  skills: string[];
  equipment_photo_urls: string[];
  availability_now: boolean;
  available_until: string | null;
  weekly_schedule: WeeklySchedule;
  approval_status: string;
  active: boolean;
  notes: string | null;
  insurance_doc_url: string | null;
  id_doc_url: string | null;
  public_liability_doc_url: string | null;
  rejected_reason: string | null;
};

export default function TechnicianDashboard() {
  const nav = useNavigate();
  const { user, loading } = useAuthSession();
  const [tech, setTech] = useState<Tech | null>(null);
  const [loadingTech, setLoadingTech] = useState(true);

  useEffect(() => {
    if (!loading && !user) nav("/technician/login", { replace: true });
  }, [user, loading, nav]);

  const load = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("technicians")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setLoadingTech(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data) {
      nav("/technician/onboarding", { replace: true });
      return;
    }
    setTech(data as unknown as Tech);
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const update = async (patch: Partial<Tech>) => {
    if (!tech) return;
    const { error } = await supabase.from("technicians").update(patch).eq("id", tech.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTech({ ...tech, ...patch } as Tech);
    toast.success("Saved");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    nav("/technician/login", { replace: true });
  };

  if (loading || loadingTech) {
    return (
      <main className="min-h-screen bg-[#0B0B0E] text-white flex items-center justify-center">
        <p className="text-white/60">Loading…</p>
      </main>
    );
  }
  if (!tech) return null;

  const toggleSkill = (s: string) => {
    const skills = tech.skills.includes(s) ? tech.skills.filter((x) => x !== s) : [...tech.skills, s];
    update({ skills });
  };

  return (
    <main className="min-h-screen bg-[#0B0B0E] text-white px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Hi, {tech.name}</h1>
            <p className="text-sm text-white/60">{tech.phone}</p>
          </div>
          <Button variant="ghost" onClick={signOut} className="text-white/70">Sign out</Button>
        </header>

        {/* Approval banner */}
        {tech.approval_status === "pending" && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm">
            <strong>Awaiting approval.</strong> Your profile is being reviewed by our ops team. You won't receive jobs until you're approved.
          </div>
        )}
        {tech.approval_status === "rejected" && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
            <strong>Application not approved.</strong> {tech.rejected_reason || "Please contact ops."}
          </div>
        )}
        {tech.approval_status === "approved" && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
            <strong>You're approved.</strong> Toggle "Available now" to start receiving job dispatches.
          </div>
        )}

        {/* Availability */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Available now</h2>
              <p className="text-sm text-white/60">Big switch — flip on when you can take a job.</p>
            </div>
            <Switch
              checked={tech.availability_now}
              onCheckedChange={(v) => update({ availability_now: v })}
            />
          </div>
          <div className="mt-4">
            <Label htmlFor="until" className="text-white/70">Available until (optional)</Label>
            <Input
              id="until"
              type="datetime-local"
              value={tech.available_until ? tech.available_until.slice(0, 16) : ""}
              onChange={(e) =>
                update({ available_until: e.target.value ? new Date(e.target.value).toISOString() : null })
              }
              className="bg-black/40 border-white/10 mt-1"
            />
          </div>
        </section>

        {/* Weekly schedule */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-lg font-semibold">Weekly schedule</h2>
          <p className="text-sm text-white/60">Default working hours per day.</p>
          <div className="mt-4">
            <WeeklyScheduleEditor
              value={tech.weekly_schedule || {}}
              onChange={(v) => update({ weekly_schedule: v })}
            />
          </div>
        </section>

        {/* Contact + service area */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-lg font-semibold">Profile</h2>
          <div className="mt-4 grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>WhatsApp</Label>
                <Input
                  defaultValue={tech.whatsapp || ""}
                  onBlur={(e) => e.target.value !== (tech.whatsapp || "") && update({ whatsapp: e.target.value || null })}
                  className="bg-black/40 border-white/10"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  defaultValue={tech.email || ""}
                  onBlur={(e) => e.target.value !== (tech.email || "") && update({ email: e.target.value || null })}
                  className="bg-black/40 border-white/10"
                />
              </div>
            </div>
            <div>
              <Label>Vehicle / mobile rig</Label>
              <Input
                defaultValue={tech.vehicle || ""}
                onBlur={(e) => e.target.value !== (tech.vehicle || "") && update({ vehicle: e.target.value || null })}
                className="bg-black/40 border-white/10"
              />
            </div>
            <div>
              <Label>Service postcode areas (comma separated)</Label>
              <Input
                defaultValue={tech.service_postcodes.join(", ")}
                onBlur={(e) => {
                  const next = e.target.value.split(",").map((p) => p.trim().toUpperCase()).filter(Boolean);
                  update({ service_postcodes: next });
                }}
                className="bg-black/40 border-white/10"
              />
            </div>
            <div>
              <Label>Max travel radius (miles)</Label>
              <Input
                type="number"
                min={1}
                max={200}
                defaultValue={tech.travel_radius_miles ?? 15}
                onBlur={(e) => update({ travel_radius_miles: Number(e.target.value) })}
                className="bg-black/40 border-white/10"
              />
            </div>
            <div>
              <Label>Skills</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {SKILL_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSkill(s)}
                    className={`rounded-full border px-3 py-1 text-sm transition ${
                      tech.skills.includes(s)
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
              <Label>Notes for dispatch</Label>
              <Textarea
                defaultValue={tech.notes || ""}
                onBlur={(e) => e.target.value !== (tech.notes || "") && update({ notes: e.target.value || null })}
                className="bg-black/40 border-white/10"
              />
            </div>
          </div>
        </section>

        {/* Equipment photos */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-lg font-semibold">Equipment photos</h2>
          <p className="text-sm text-white/60">Show your van, tools, and tyre stock. Helps the AI match you to the right jobs.</p>
          <div className="mt-4">
            <PhotosUploader
              userId={user!.id}
              urls={tech.equipment_photo_urls}
              onChange={(urls) => update({ equipment_photo_urls: urls })}
            />
          </div>
        </section>

        {/* Documents */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-lg font-semibold">Documents</h2>
          <p className="text-sm text-white/60">Private — only you and ops can see these.</p>
          <div className="mt-4 grid gap-3">
            <DocumentsUploader
              userId={user!.id}
              label="Insurance"
              currentUrl={tech.insurance_doc_url}
              field="insurance_doc_url"
              onChange={(url) => update({ insurance_doc_url: url })}
            />
            <DocumentsUploader
              userId={user!.id}
              label="ID (driver's licence or passport)"
              currentUrl={tech.id_doc_url}
              field="id_doc_url"
              onChange={(url) => update({ id_doc_url: url })}
            />
            <DocumentsUploader
              userId={user!.id}
              label="Public liability"
              currentUrl={tech.public_liability_doc_url}
              field="public_liability_doc_url"
              onChange={(url) => update({ public_liability_doc_url: url })}
            />
          </div>
        </section>

        <div className="flex flex-wrap gap-2 text-xs text-white/40">
          <Badge variant="secondary" className="bg-white/5 text-white/70">Status: {tech.approval_status}</Badge>
          <Badge variant="secondary" className="bg-white/5 text-white/70">Active: {tech.active ? "yes" : "no"}</Badge>
        </div>
      </div>
    </main>
  );
}
