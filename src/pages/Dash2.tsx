import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardData, shortRef, fmtRelative, type DashTech, type DashJob } from "@/hooks/useDashboardData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/admin/dashboard/StatusBadge";
import { TechConversation } from "@/components/admin/TechConversation";
import { JobDetailDrawer } from "@/pages/admin/JobDetailDrawer";
import { toast } from "sonner";
import { Send, Megaphone, MessageSquare, Briefcase, LogOut } from "lucide-react";

function digits(p?: string | null) {
  return (p || "").replace(/^whatsapp:/, "").replace(/[^\d]/g, "");
}

export default function Dash2() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const { jobs, quotes, allocations, techs } = useDashboardData();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin/login", { replace: true }); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (!(roles ?? []).some((r: any) => r.role === "admin")) {
        toast.error("Admin role required");
        navigate("/admin/login", { replace: true });
        return;
      }
      setAuthed(true);
    })();
  }, [navigate]);

  if (!authed) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur">
        <div className="text-sm font-semibold">Tyre Fly · Dash2</div>
        <div className="ml-auto">
          <Button size="sm" variant="ghost" onClick={async () => { await supabase.auth.signOut(); navigate("/admin/login"); }}>
            <LogOut className="mr-1 h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4">
        <Tabs defaultValue="chats" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-flex">
            <TabsTrigger value="chats" className="gap-2"><MessageSquare className="h-4 w-4" /> Tech Chats</TabsTrigger>
            <TabsTrigger value="jobs" className="gap-2"><Briefcase className="h-4 w-4" /> Incoming Jobs</TabsTrigger>
          </TabsList>

          <TabsContent value="chats" className="mt-4">
            <ChatsTab techs={techs} jobs={jobs} />
          </TabsContent>

          <TabsContent value="jobs" className="mt-4">
            <JobsTab jobs={jobs} quotes={quotes} allocations={allocations} techs={techs} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ---------------- Chats tab ---------------- */

function ChatsTab({ techs, jobs }: { techs: DashTech[]; jobs: DashJob[] }) {
  const activeTechs = useMemo(
    () => techs.filter((t) => t.active && t.approval_status === "approved" && (t.whatsapp || t.phone)),
    [techs],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = activeTechs.find((t) => t.id === selectedId) ?? null;
  const selectedPhone = selected?.whatsapp || selected?.phone || "";

  // broadcast state
  const [bMsg, setBMsg] = useState("");
  const [bJobId, setBJobId] = useState<string>("none");
  const [bChannel, setBChannel] = useState<"whatsapp" | "sms">("whatsapp");
  const [sending, setSending] = useState(false);

  // open jobs only for the job picker
  const openJobs = useMemo(
    () => jobs.filter((j) => !["completed", "paid", "closed", "cancelled"].includes(j.status)).slice(0, 50),
    [jobs],
  );

  const buildJobBlurb = (j: DashJob | undefined) => {
    if (!j) return "";
    const parts = [
      `JOB #${shortRef(j.id)}`,
      j.postcode ? `Postcode: ${j.postcode}` : null,
      j.vehicle_reg ? `Reg: ${j.vehicle_reg}` : null,
      j.tyre_size ? `Tyre: ${j.tyre_size}` : null,
      j.damage_summary || j.issue_type ? `Issue: ${j.damage_summary || j.issue_type}` : null,
      j.lat && j.lng ? `Location: https://maps.google.com/?q=${j.lat},${j.lng}` : null,
    ].filter(Boolean);
    return parts.join("\n");
  };

  const broadcast = async () => {
    const job = bJobId !== "none" ? openJobs.find((j) => j.id === bJobId) : undefined;
    const body = [buildJobBlurb(job), bMsg.trim()].filter(Boolean).join("\n\n");
    if (!body) { toast.error("Message or job required"); return; }
    if (activeTechs.length === 0) { toast.error("No active technicians"); return; }
    setSending(true);
    let ok = 0, fail = 0;
    await Promise.all(activeTechs.map(async (t) => {
      const to = t.whatsapp || t.phone;
      if (!to) { fail++; return; }
      try {
        const { error } = await supabase.functions.invoke("twilio-send", {
          body: { to, body, channel: bChannel },
        });
        if (error) throw error;
        ok++;
      } catch { fail++; }
    }));
    setSending(false);
    toast.success(`Broadcast sent: ${ok} ok, ${fail} failed`);
    setBMsg("");
    setBJobId("none");
  };

  return (
    <div className="space-y-4">
      {/* Broadcast composer */}
      <Card className="border-border/60 bg-card/60 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          <div className="text-sm font-semibold">Broadcast to all technicians</div>
          <span className="ml-auto text-xs text-muted-foreground">{activeTechs.length} active</span>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <Select value={bJobId} onValueChange={setBJobId}>
            <SelectTrigger><SelectValue placeholder="Attach a job (optional)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No job — text only</SelectItem>
              {openJobs.map((j) => (
                <SelectItem key={j.id} value={j.id}>
                  #{shortRef(j.id)} · {j.postcode ?? "—"} · {j.customer_name ?? "—"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={bChannel} onValueChange={(v) => setBChannel(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Textarea
          className="mt-2 min-h-[90px]"
          placeholder="Optional note to add to the broadcast…"
          value={bMsg}
          onChange={(e) => setBMsg(e.target.value)}
        />
        <div className="mt-2 flex justify-end">
          <Button onClick={broadcast} disabled={sending}>
            <Send className="mr-1 h-4 w-4" /> {sending ? "Sending…" : `Send to ${activeTechs.length} techs`}
          </Button>
        </div>
      </Card>

      {/* Per-tech threads */}
      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        <Card className="border-border/60 bg-card/60 p-2">
          <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Technicians
          </div>
          <div className="max-h-[60vh] space-y-1 overflow-y-auto">
            {activeTechs.length === 0 && (
              <p className="p-3 text-xs text-muted-foreground">No active technicians.</p>
            )}
            {activeTechs.map((t) => {
              const active = t.id === selectedId;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full rounded-md px-2 py-2 text-left text-sm transition-colors ${
                    active ? "bg-primary/15 text-primary" : "hover:bg-muted/40"
                  }`}
                >
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.whatsapp || t.phone || "—"}</div>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="border-border/60 bg-card/60 p-3">
          {!selected ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              Select a technician to view conversation
            </div>
          ) : (
            <ThreadPane tech={selected} phone={selectedPhone} />
          )}
        </Card>
      </div>
    </div>
  );
}

function ThreadPane({ tech, phone }: { tech: DashTech; phone: string }) {
  const [msg, setMsg] = useState("");
  const [channel, setChannel] = useState<"whatsapp" | "sms">("whatsapp");
  const [sending, setSending] = useState(false);

  const send = async () => {
    const body = msg.trim();
    if (!body) return;
    if (!phone) { toast.error("Technician has no phone"); return; }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("twilio-send", {
        body: { to: phone, body, channel },
      });
      if (error) throw error;
      setMsg("");
      toast.success("Message sent");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">{tech.name}</div>
          <div className="text-xs text-muted-foreground">{phone || "no phone"}</div>
        </div>
        <Select value={channel} onValueChange={(v) => setChannel(v as any)}>
          <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <TechConversation phone={phone} />

      <div className="flex items-end gap-2">
        <Textarea
          className="min-h-[60px] flex-1"
          placeholder="Type a message to this technician…"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void send(); }
          }}
        />
        <Button onClick={send} disabled={sending || !msg.trim()}>
          <Send className="mr-1 h-4 w-4" /> {sending ? "…" : "Send"}
        </Button>
      </div>
    </div>
  );
}

/* ---------------- Jobs tab ---------------- */

function JobsTab({
  jobs, quotes, allocations, techs,
}: {
  jobs: DashJob[];
  quotes: ReturnType<typeof useDashboardData>["quotes"];
  allocations: ReturnType<typeof useDashboardData>["allocations"];
  techs: DashTech[];
}) {
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const incoming = useMemo(() => {
    const s = search.trim().toLowerCase();
    return jobs
      .filter((j) => !["completed", "closed", "cancelled"].includes(j.status))
      .filter((j) => {
        if (!s) return true;
        return `${j.customer_name ?? ""} ${j.postcode ?? ""} ${j.customer_phone ?? ""} ${j.vehicle_reg ?? ""} ${shortRef(j.id)}`
          .toLowerCase().includes(s);
      });
  }, [jobs, search]);

  const openJob = openId ? jobs.find((j) => j.id === openId) ?? null : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Incoming jobs</h2>
          <p className="text-xs text-muted-foreground">{incoming.length} open · click a row to assign technician & quote</p>
        </div>
        <Input
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-48"
        />
      </div>

      <Card className="overflow-hidden border-border/60 bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Postcode</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tech</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incoming.map((j) => {
                const tech = techs.find((t) => t.id === j.assigned_technician_id);
                return (
                  <TableRow
                    key={j.id}
                    className="cursor-pointer hover:bg-primary/[0.04]"
                    onClick={() => setOpenId(j.id)}
                  >
                    <TableCell className="font-mono text-xs font-semibold text-primary">#{shortRef(j.id)}</TableCell>
                    <TableCell className="text-sm">{j.customer_name ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{j.postcode ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs uppercase">{j.vehicle_reg ?? "—"}</TableCell>
                    <TableCell className="max-w-[260px] truncate text-sm text-muted-foreground">
                      {j.damage_summary || j.issue_type || "—"}
                    </TableCell>
                    <TableCell><StatusBadge status={j.status} /></TableCell>
                    <TableCell className="text-sm">
                      {tech?.name ?? <span className="text-muted-foreground">Unassigned</span>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{fmtRelative(j.created_at)}</TableCell>
                  </TableRow>
                );
              })}
              {incoming.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    No incoming jobs
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <JobDetailDrawer
        job={openJob}
        open={!!openJob}
        onOpenChange={(v) => { if (!v) setOpenId(null); }}
        quotes={quotes}
        allocations={allocations}
        techs={techs}
      />
    </div>
  );
}
