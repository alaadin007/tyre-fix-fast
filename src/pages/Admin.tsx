import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import {
  MessageSquare,
  Users,
  Brain,
  Plus,
  Trash2,
  Star,
  Phone,
  MapPin,
  RefreshCw,
  Upload,
} from "lucide-react";
import { parseTechniciansFile, type ParsedTechnician } from "@/lib/parseTechnicians";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

type Technician = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  service_postcodes: string[];
  vehicle: string | null;
  rating: number | null;
  jobs_completed: number;
  active: boolean;
  notes: string | null;
  created_at: string;
};

type SmsMessage = {
  id: string;
  direction: string;
  from_number: string;
  to_number: string;
  body: string;
  num_media: number;
  media_urls: string[];
  status: string;
  created_at: string;
};

type Allocation = {
  id: string;
  job_id: string | null;
  technician_id: string | null;
  ai_reasoning: string | null;
  match_score: number | null;
  status: string;
  created_at: string;
};

const techSchema = z.object({
  name: z.string().trim().min(2, "Name required").max(100),
  phone: z.string().trim().min(7, "Phone required").max(20),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  service_postcodes: z.string().trim().min(1, "Add at least one postcode area"),
  vehicle: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export default function Admin() {
  const [techs, setTechs] = useState<Technician[]>([]);
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    service_postcodes: "",
    vehicle: "",
    notes: "",
  });

  const techMap = useMemo(() => {
    const m = new Map<string, Technician>();
    techs.forEach((t) => m.set(t.id, t));
    return m;
  }, [techs]);

  const refreshAll = async () => {
    setLoading(true);
    const [tRes, mRes, aRes] = await Promise.all([
      supabase.from("technicians").select("*").order("created_at", { ascending: false }),
      supabase.from("sms_messages").select("*").order("created_at", { ascending: false }).limit(100),
      supabase
        .from("job_allocations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    if (tRes.data) setTechs(tRes.data as Technician[]);
    if (mRes.data) setMessages(mRes.data as SmsMessage[]);
    if (aRes.data) setAllocations(aRes.data as Allocation[]);
    setLoading(false);
  };

  useEffect(() => {
    refreshAll();
    const ch = supabase
      .channel("admin-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "sms_messages" }, refreshAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "job_allocations" }, refreshAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "technicians" }, refreshAll)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = techSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    const postcodes = form.service_postcodes
      .split(",")
      .map((p) => p.trim().toUpperCase())
      .filter(Boolean);

    const { error } = await supabase.from("technicians").insert({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      service_postcodes: postcodes,
      vehicle: form.vehicle.trim() || null,
      notes: form.notes.trim() || null,
      active: true,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Technician added");
    setForm({ name: "", phone: "", email: "", service_postcodes: "", vehicle: "", notes: "" });
  };

  const toggleActive = async (t: Technician) => {
    await supabase.from("technicians").update({ active: !t.active }).eq("id", t.id);
  };

  const deleteTech = async (id: string) => {
    if (!confirm("Remove this technician?")) return;
    await supabase.from("technicians").delete().eq("id", id);
  };

  // Bulk import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ParsedTechnician[] | null>(null);

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const parsed = await parseTechniciansFile(file);
      if (parsed.length === 0) {
        toast.error("No technicians found. Need columns/fields: name, phone, postcodes.");
        return;
      }
      setPreview(parsed);
      toast.success(`Found ${parsed.length} technician(s) — review & confirm`);
    } catch (err) {
      console.error(err);
      toast.error("Could not read that file");
    }
  };

  const confirmImport = async () => {
    if (!preview || preview.length === 0) return;
    setImporting(true);
    const rows = preview.map((p) => ({
      name: p.name,
      phone: p.phone,
      email: p.email || null,
      service_postcodes: p.service_postcodes,
      vehicle: p.vehicle || null,
      notes: p.notes || null,
      active: true,
    }));
    const { error } = await supabase.from("technicians").insert(rows);
    setImporting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Imported ${rows.length} technician(s)`);
    setPreview(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← FlatTyreNearMe.Com
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Admin Console</h1>
          </div>
          <Button variant="outline" size="sm" onClick={refreshAll} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
          <StatCard icon={<MessageSquare />} label="Inbound SMS (24h)" value={messages.filter(m => m.direction === 'inbound' && Date.now() - new Date(m.created_at).getTime() < 86400000).length} />
          <StatCard icon={<Users />} label="Active technicians" value={techs.filter(t => t.active).length} />
          <StatCard icon={<Brain />} label="AI allocations" value={allocations.length} />
        </div>

        <Tabs defaultValue="messages">
          <TabsList>
            <TabsTrigger value="messages">
              <MessageSquare className="mr-1" /> Messages
            </TabsTrigger>
            <TabsTrigger value="allocations">
              <Brain className="mr-1" /> AI Allocations
            </TabsTrigger>
            <TabsTrigger value="technicians">
              <Users className="mr-1" /> Technicians
            </TabsTrigger>
          </TabsList>

          {/* MESSAGES */}
          <TabsContent value="messages">
            <Card>
              <CardHeader>
                <CardTitle>Incoming SMS</CardTitle>
                <CardDescription>Live feed of incoming messages from customers</CardDescription>
              </CardHeader>
              <CardContent>
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No messages yet. Point your Twilio number's "A MESSAGE COMES IN" webhook to the URL below.</p>
                ) : (
                  <div className="space-y-2">
                    {messages.map((m) => (
                      <div key={m.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Badge variant={m.direction === "inbound" ? "default" : "secondary"}>
                              {m.direction}
                            </Badge>
                            <Phone className="h-3 w-3" />
                            <span>{m.direction === "inbound" ? m.from_number : m.to_number}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(m.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{m.body || <em className="text-muted-foreground">(no body)</em>}</p>
                        {m.media_urls?.length > 0 && (
                          <div className="mt-2 flex gap-2 flex-wrap">
                            {m.media_urls.map((u, i) => (
                              <a key={i} href={u} target="_blank" rel="noreferrer" className="text-xs text-primary underline">📎 media {i + 1}</a>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ALLOCATIONS */}
          <TabsContent value="allocations">
            <Card>
              <CardHeader>
                <CardTitle>AI Technician Allocations</CardTitle>
                <CardDescription>How the AI is routing inbound jobs</CardDescription>
              </CardHeader>
              <CardContent>
                {allocations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No allocations yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>Technician</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Reasoning</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allocations.map((a) => {
                        const t = a.technician_id ? techMap.get(a.technician_id) : null;
                        return (
                          <TableRow key={a.id}>
                            <TableCell className="text-xs">{new Date(a.created_at).toLocaleString()}</TableCell>
                            <TableCell className="font-medium">{t?.name ?? <em className="text-muted-foreground">unassigned</em>}</TableCell>
                            <TableCell><Badge variant="outline">{a.match_score ?? 0}</Badge></TableCell>
                            <TableCell className="text-sm max-w-md">{a.ai_reasoning}</TableCell>
                            <TableCell><Badge>{a.status}</Badge></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TECHNICIANS */}
          <TabsContent value="technicians">
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle><Plus className="inline mr-1" />Add Technician</CardTitle>
                  <CardDescription>They become available to the AI router immediately</CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-3" onSubmit={addTechnician}>
                    <div>
                      <Label htmlFor="t-name">Name</Label>
                      <Input id="t-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sam Walker" />
                    </div>
                    <div>
                      <Label htmlFor="t-phone">Phone</Label>
                      <Input id="t-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+447700900111" />
                    </div>
                    <div>
                      <Label htmlFor="t-email">Email (optional)</Label>
                      <Input id="t-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="sam@flat..." />
                    </div>
                    <div>
                      <Label htmlFor="t-pc">Service postcode areas</Label>
                      <Input id="t-pc" value={form.service_postcodes} onChange={(e) => setForm({ ...form, service_postcodes: e.target.value })} placeholder="W5, W12, NW10" />
                      <p className="text-xs text-muted-foreground mt-1">Comma-separated outward codes</p>
                    </div>
                    <div>
                      <Label htmlFor="t-veh">Vehicle (optional)</Label>
                      <Input id="t-veh" value={form.vehicle} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} placeholder="Ford Transit van" />
                    </div>
                    <div>
                      <Label htmlFor="t-notes">Notes (optional)</Label>
                      <Textarea id="t-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
                    </div>
                    <Button type="submit" className="w-full">Add technician</Button>
                  </form>

                  <div className="mt-6 border-t pt-4">
                    <p className="text-sm font-semibold mb-2">Bulk import</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Upload CSV, Excel (.xlsx/.xls), Word (.docx), or text file. Headers expected:
                      <span className="font-mono"> name, phone, postcodes, email, vehicle, notes</span>.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls,.xlsm,.ods,.docx,.txt,.tsv,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="hidden"
                      onChange={handleFileChosen}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload /> Choose file…
                    </Button>

                    {preview && (
                      <div className="mt-4 rounded-md border bg-muted/30 p-3">
                        <p className="text-xs font-semibold mb-2">
                          Preview — {preview.length} technician(s)
                        </p>
                        <div className="max-h-48 overflow-y-auto text-xs space-y-1">
                          {preview.slice(0, 20).map((p, i) => (
                            <div key={i} className="truncate">
                              <span className="font-medium">{p.name}</span> · {p.phone}
                              {p.service_postcodes.length > 0 && (
                                <span className="text-muted-foreground"> · {p.service_postcodes.join(", ")}</span>
                              )}
                            </div>
                          ))}
                          {preview.length > 20 && (
                            <div className="text-muted-foreground">…and {preview.length - 20} more</div>
                          )}
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" onClick={confirmImport} disabled={importing} className="flex-1">
                            {importing ? "Importing…" : `Import ${preview.length}`}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Registered Technicians</CardTitle>
                  <CardDescription>{techs.length} total · {techs.filter(t => t.active).length} active</CardDescription>
                </CardHeader>
                <CardContent>
                  {techs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No technicians yet — add your first one on the left.</p>
                  ) : (
                    <div className="space-y-3">
                      {techs.map((t) => (
                        <div key={t.id} className="rounded-lg border p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold">{t.name}</p>
                                <Badge variant={t.active ? "default" : "secondary"}>{t.active ? "active" : "inactive"}</Badge>
                                <span className="flex items-center gap-1 text-sm">
                                  <Star className="h-3 w-3 fill-current text-yellow-500" />{t.rating ?? "—"}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <Phone className="h-3 w-3" /> {t.phone}
                              </p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {t.service_postcodes.join(", ") || "no areas"}
                              </p>
                              {t.vehicle && <p className="text-xs text-muted-foreground mt-1">🚐 {t.vehicle}</p>}
                              <p className="text-xs text-muted-foreground mt-1">{t.jobs_completed} jobs completed</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Switch checked={t.active} onCheckedChange={() => toggleActive(t)} />
                              <Button variant="ghost" size="icon" onClick={() => deleteTech(t.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <Card className="mt-6 border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Twilio Webhook Setup</CardTitle>
            <CardDescription>Paste this into your Twilio number's "A MESSAGE COMES IN" webhook (HTTP POST):</CardDescription>
          </CardHeader>
          <CardContent>
            <code className="block bg-muted p-3 rounded text-xs break-all">
              {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/twilio-inbound`}
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              Twilio Console → Phone Numbers → Active numbers → +447447184489 → Messaging configuration.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
