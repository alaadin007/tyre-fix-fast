import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  Check,
  X,
  FileText,
  Phone,
  Mail,
  MapPin,
  Wrench,
  MessageSquare,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { TechConversation } from "./TechConversation";

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
  weekly_schedule: Record<string, unknown> | null;
  last_lat: number | null;
  last_lng: number | null;
  skills: string[];
  equipment_photo_urls: string[];
  notes: string | null;
  insurance_doc_url: string | null;
  id_doc_url: string | null;
  public_liability_doc_url: string | null;
  created_at: string;
  approval_status: string;
};

type Tab = "pending" | "intake" | "rejected";

function missingFields(t: PendingTech): { label: string; ask: string }[] {
  const out: { label: string; ask: string }[] = [];
  if (!t.name || t.name === "Pending applicant")
    out.push({ label: "Full name", ask: "your full name" });
  if (!t.service_postcodes?.length)
    out.push({ label: "Service area", ask: "the postcodes / cities you cover" });
  if (!t.vehicle) out.push({ label: "Vehicle", ask: "your van make, model & year" });
  if (!t.travel_radius_miles)
    out.push({ label: "Travel radius", ask: "how far you can travel (miles)" });
  if (!t.weekly_schedule || !Object.keys(t.weekly_schedule || {}).length)
    out.push({ label: "Weekly hours", ask: "your weekly availability (e.g. Mon 9-6)" });
  if (t.last_lat === null || t.last_lng === null)
    out.push({ label: "Live location pin 📍", ask: "a 📍live location pin" });
  if (!t.equipment_photo_urls?.length)
    out.push({ label: "Equipment photo", ask: "a photo of your tyre fitting equipment" });
  if (!t.insurance_doc_url)
    out.push({ label: "Insurance doc", ask: "a photo of your insurance certificate" });
  if (!t.id_doc_url)
    out.push({ label: "Photo ID", ask: "a photo of your driving licence or passport" });
  if (!t.public_liability_doc_url)
    out.push({ label: "Public liability", ask: "a photo of your public liability certificate" });
  return out;
}

export function PendingTechnicians() {
  const [rows, setRows] = useState<PendingTech[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("pending");
  const [rejectFor, setRejectFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [requestFor, setRequestFor] = useState<string | null>(null);
  const [requestMsg, setRequestMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [openConv, setOpenConv] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("technicians")
      .select("*")
      .in("approval_status", ["pending", "intake", "rejected"])
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((data || []) as unknown as PendingTech[]);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("pending-techs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "technicians" },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const counts = useMemo(
    () => ({
      pending: rows.filter((r) => r.approval_status === "pending").length,
      intake: rows.filter((r) => r.approval_status === "intake").length,
      rejected: rows.filter((r) => r.approval_status === "rejected").length,
    }),
    [rows],
  );

  const visible = rows.filter((r) => r.approval_status === tab);

  const approve = async (t: PendingTech) => {
    setBusy(t.id);
    const { error } = await supabase
      .from("technicians")
      .update({
        approval_status: "approved",
        approved_at: new Date().toISOString(),
        active: true,
      })
      .eq("id", t.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`${t.name} approved`);
    // Notify technician on WhatsApp + SMS
    void supabase.functions.invoke("twilio-send", {
      body: {
        to: t.phone,
        body: `✅ You're approved as a Tyre Fly technician${t.name ? `, ${t.name.split(" ")[0]}` : ""}! Jobs in your area will arrive on this number.`,
        channel: "whatsapp",
      },
    });
  };

  const reject = async (t: PendingTech) => {
    setBusy(t.id);
    const reason = rejectReason || "Not approved";
    const { error } = await supabase
      .from("technicians")
      .update({
        approval_status: "rejected",
        rejected_reason: reason,
        active: false,
      })
      .eq("id", t.id);
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`${t.name} rejected`);
    setRejectFor(null);
    setRejectReason("");
    void supabase.functions.invoke("twilio-send", {
      body: {
        to: t.phone,
        body: `Hi${t.name ? ` ${t.name.split(" ")[0]}` : ""} — thanks for applying to Tyre Fly. We're unable to approve your profile right now: ${reason}`,
        channel: "whatsapp",
      },
    });
  };

  const openRequest = (t: PendingTech) => {
    const miss = missingFields(t);
    const items = miss.map((m) => `• ${m.ask}`).join("\n");
    const draft = miss.length
      ? `Hi${t.name && t.name !== "Pending applicant" ? ` ${t.name.split(" ")[0]}` : ""} — to finish your Tyre Fly sign-up, please send:\n\n${items}\n\nReply on this WhatsApp chat. Thanks!`
      : `Hi — could you send a quick update on your application?`;
    setRequestFor(t.id);
    setRequestMsg(draft);
  };

  const sendRequest = async (t: PendingTech) => {
    if (!requestMsg.trim()) return;
    setBusy(t.id);
    const { error } = await supabase.functions.invoke("twilio-send", {
      body: { to: t.phone, body: requestMsg, channel: "whatsapp" },
    });
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success(`Sent to ${t.phone}`);
    setRequestFor(null);
    setRequestMsg("");
  };

  const docUrl = async (path: string | null) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const { data } = await supabase.storage
      .from("technician-docs")
      .createSignedUrl(path, 60 * 5);
    return data?.signedUrl || null;
  };

  return (
    <section className="rounded-2xl border-2 border-yellow-500/30 bg-yellow-500/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          Technician approval queue
        </h2>
        <Button size="sm" variant="ghost" onClick={load}>
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="mt-3 flex flex-wrap gap-1 rounded-lg bg-background/60 p-1 text-sm">
        {(
          [
            { key: "pending", label: "Ready to review", count: counts.pending },
            { key: "intake", label: "In progress", count: counts.intake },
            { key: "rejected", label: "Rejected", count: counts.rejected },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-md px-3 py-1.5 transition-colors ${
              tab === t.key
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted/60"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 h-5 px-1.5 text-[10px]"
              >
                {t.count}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {tab === "pending"
            ? "No applications waiting for review."
            : tab === "intake"
              ? "No applicants currently filling in their details."
              : "No rejected applications."}
        </p>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {visible.map((t) => {
            const miss = missingFields(t);
            const totalSteps = 10;
            const done = totalSteps - miss.length;
            const pct = Math.round((done / totalSteps) * 100);
            return (
              <article
                key={t.id}
                className="rounded-xl border border-white/40 bg-white/70 p-4 backdrop-blur"
              >
                <header className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">
                      {t.name || "Pending applicant"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Applied {new Date(t.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      t.approval_status === "pending"
                        ? "border-blue-500/50 text-blue-700"
                        : t.approval_status === "intake"
                          ? "border-amber-500/50 text-amber-700"
                          : "border-red-500/50 text-red-700"
                    }
                  >
                    {t.approval_status}
                  </Badge>
                </header>

                {/* Progress bar */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full ${pct === 100 ? "bg-emerald-500" : "bg-amber-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {done}/{totalSteps}
                  </span>
                </div>

                <div className="mt-3 grid gap-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3 text-muted-foreground" /> {t.phone}
                  </div>
                  {t.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 text-muted-foreground" /> {t.email}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-muted-foreground" />{" "}
                    {t.service_postcodes?.join(", ") || "—"} ·{" "}
                    {t.travel_radius_miles ?? "?"}mi
                  </div>
                  <div className="flex items-center gap-2">
                    <Wrench className="h-3 w-3 text-muted-foreground" />{" "}
                    {t.vehicle || "No vehicle listed"}
                  </div>
                </div>

                {t.equipment_photo_urls?.length > 0 && (
                  <div className="mt-3 grid grid-cols-4 gap-1">
                    {t.equipment_photo_urls.slice(0, 4).map((u) => (
                      <a
                        key={u}
                        href={u}
                        target="_blank"
                        rel="noreferrer"
                        className="aspect-square overflow-hidden rounded border border-border"
                      >
                        <img
                          src={u}
                          alt="Equipment"
                          className="h-full w-full object-cover"
                        />
                      </a>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {(
                    [
                      "insurance_doc_url",
                      "id_doc_url",
                      "public_liability_doc_url",
                    ] as const
                  ).map((k) => {
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
                          path
                            ? "border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10"
                            : "border-border text-muted-foreground/50"
                        }`}
                      >
                        <FileText className="h-3 w-3" />
                        {k === "insurance_doc_url"
                          ? "Insurance"
                          : k === "id_doc_url"
                            ? "ID"
                            : "Public liability"}
                      </button>
                    );
                  })}
                </div>

                {miss.length > 0 && (
                  <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                      <AlertCircle className="h-3 w-3" /> Missing ({miss.length})
                    </p>
                    <ul className="mt-1 flex flex-wrap gap-1">
                      {miss.map((m) => (
                        <li
                          key={m.label}
                          className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[11px] text-amber-800"
                        >
                          {m.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {t.notes && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Notes: {t.notes}
                  </p>
                )}

                {/* Action area */}
                {rejectFor === t.id ? (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      placeholder="Reason (sent to technician on WhatsApp)"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy === t.id}
                        onClick={() => reject(t)}
                      >
                        Confirm reject
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setRejectFor(null);
                          setRejectReason("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : requestFor === t.id ? (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      rows={5}
                      value={requestMsg}
                      onChange={(e) => setRequestMsg(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={busy === t.id}
                        onClick={() => sendRequest(t)}
                      >
                        <MessageSquare className="mr-1 h-4 w-4" />
                        Send on WhatsApp
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setRequestFor(null);
                          setRequestMsg("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={busy === t.id}
                      onClick={() => approve(t)}
                    >
                      <Check className="mr-1 h-4 w-4" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openRequest(t)}
                    >
                      <MessageSquare className="mr-1 h-4 w-4" /> Request info
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-700"
                      onClick={() => setRejectFor(t.id)}
                    >
                      <X className="mr-1 h-4 w-4" /> Reject
                    </Button>
                  </div>
                )}

                {/* Conversation thread */}
                <div className="mt-3 border-t border-border/60 pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenConv(openConv === t.id ? null : t.id)
                    }
                    className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="h-3 w-3" />
                      WhatsApp & SMS conversation
                    </span>
                    {openConv === t.id ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                  {openConv === t.id && (
                    <div className="mt-2">
                      <TechConversation phone={t.phone} />
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
