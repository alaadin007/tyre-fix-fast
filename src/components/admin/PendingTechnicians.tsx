import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, FileText, Phone, Mail, MapPin, Wrench } from "lucide-react";

type PendingTech = {
  id: string;
  user_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  whatsapp: string | null;
  vehicle: string | null;
  service_postcodes: string[];
  travel_radius_miles: number | null;
  skills: string[];
  equipment_photo_urls: string[];
  notes: string | null;
  insurance_doc_url: string | null;
  id_doc_url: string | null;
  public_liability_doc_url: string | null;
  created_at: string;
  approval_status: string;
};

export function PendingTechnicians() {
  const [pending, setPending] = useState<PendingTech[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("technicians")
      .select("*")
      .eq("approval_status", "pending")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPending((data || []) as unknown as PendingTech[]);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("pending-techs")
      .on("postgres_changes", { event: "*", schema: "public", table: "technicians" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const approve = async (t: PendingTech) => {
    const { error } = await supabase
      .from("technicians")
      .update({
        approval_status: "approved",
        approved_at: new Date().toISOString(),
        active: true,
      })
      .eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success(`${t.name} approved`);
  };

  const reject = async (t: PendingTech) => {
    const { error } = await supabase
      .from("technicians")
      .update({
        approval_status: "rejected",
        rejected_reason: rejectReason || "Not approved",
        active: false,
      })
      .eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success(`${t.name} rejected`);
    setRejectFor(null);
    setRejectReason("");
  };

  const docUrl = async (path: string | null) => {
    if (!path) return null;
    const { data } = await supabase.storage.from("technician-docs").createSignedUrl(path, 60 * 5);
    return data?.signedUrl || null;
  };

  return (
    <section className="rounded-2xl border-2 border-yellow-500/30 bg-yellow-500/5 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Pending technician approvals
          {pending.length > 0 && (
            <Badge className="ml-2 bg-yellow-500/20 text-yellow-700">{pending.length}</Badge>
          )}
        </h2>
        <Button size="sm" variant="ghost" onClick={load}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      ) : pending.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No pending applications.</p>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {pending.map((t) => (
            <article key={t.id} className="rounded-xl border border-white/40 bg-white/70 p-4 backdrop-blur">
              <header className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{t.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    Applied {new Date(t.created_at).toLocaleString()}
                  </p>
                </div>
                <Badge variant="outline">pending</Badge>
              </header>

              <div className="mt-3 grid gap-1 text-sm">
                <div className="flex items-center gap-2"><Phone className="h-3 w-3 text-muted-foreground" /> {t.phone}</div>
                {t.whatsapp && <div className="flex items-center gap-2 text-muted-foreground">WhatsApp: {t.whatsapp}</div>}
                {t.email && <div className="flex items-center gap-2"><Mail className="h-3 w-3 text-muted-foreground" /> {t.email}</div>}
                <div className="flex items-center gap-2"><MapPin className="h-3 w-3 text-muted-foreground" /> {t.service_postcodes.join(", ") || "—"} · {t.travel_radius_miles ?? "?"}mi</div>
                <div className="flex items-center gap-2"><Wrench className="h-3 w-3 text-muted-foreground" /> {t.vehicle || "No vehicle listed"}</div>
              </div>

              {t.skills.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {t.skills.map((s) => (
                    <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                  ))}
                </div>
              )}

              {t.equipment_photo_urls.length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-1">
                  {t.equipment_photo_urls.slice(0, 4).map((u) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer" className="aspect-square overflow-hidden rounded border border-border">
                      <img src={u} alt="Equipment" className="h-full w-full object-cover" />
                    </a>
                  ))}
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {(["insurance_doc_url", "id_doc_url", "public_liability_doc_url"] as const).map((k) => {
                  const path = t[k];
                  return (
                    <button
                      key={k}
                      type="button"
                      disabled={!path}
                      onClick={async () => {
                        const url = await docUrl(path);
                        if (url) window.open(url, "_blank");
                      }}
                      className={`flex items-center gap-1 rounded border px-2 py-1 ${
                        path ? "border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10" : "border-border text-muted-foreground/50"
                      }`}
                    >
                      <FileText className="h-3 w-3" />
                      {k === "insurance_doc_url" ? "Insurance" : k === "id_doc_url" ? "ID" : "Public liability"}
                    </button>
                  );
                })}
              </div>

              {t.notes && <p className="mt-3 text-xs text-muted-foreground">Notes: {t.notes}</p>}

              {rejectFor === t.id ? (
                <div className="mt-3 space-y-2">
                  <Textarea
                    placeholder="Reason (visible to technician)"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" onClick={() => reject(t)}>
                      Confirm reject
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setRejectFor(null); setRejectReason(""); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex gap-2">
                  <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => approve(t)}>
                    <Check className="mr-1 h-4 w-4" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setRejectFor(t.id)}>
                    <X className="mr-1 h-4 w-4" /> Reject
                  </Button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
