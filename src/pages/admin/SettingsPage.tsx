import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { JOB_STATUS_LABELS } from "@/lib/jobStatus";
import { toast } from "sonner";
import { Plus, Trash2, Save, X } from "lucide-react";

type SettingsMap = Record<string, any>;

const ROLE_OPTIONS = [
  { value: "super_admin", label: "Super Admin", desc: "Full access to everything including roles, billing, and dangerous actions." },
  { value: "ops_admin", label: "Operations Admin", desc: "Manages jobs, technicians, quotes, dispatch, and payments." },
  { value: "support", label: "Support Staff", desc: "Can view and respond to customers, update job notes." },
  { value: "viewer", label: "Read-only Viewer", desc: "View-only access to dashboards and reports." },
  { value: "admin", label: "Admin (legacy)", desc: "Legacy full admin role." },
];

const DEFAULT_NOTIFICATIONS = {
  notify_admin_new_job: true,
  notify_admin_payment_received: true,
  notify_admin_tech_application: true,
  notify_customer_quote: true,
  notify_customer_tech_assigned: true,
  notify_tech_new_job: true,
  alert_unassigned_after_minutes: 30,
};

const DEFAULT_PAYMENTS = {
  currency: "GBP",
  deposit_percent: 0,
  fee_label: "Service fee",
  enable_live: false,
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsMap>({});

  // role management
  const [emailToAssign, setEmailToAssign] = useState("");
  const [roleToAssign, setRoleToAssign] = useState<string>("ops_admin");
  const [roleRows, setRoleRows] = useState<Array<{ id: string; user_id: string; role: string; email?: string }>>([]);

  async function loadAll() {
    setLoading(true);
    const { data: rows } = await supabase.from("app_settings").select("key,value");
    const map: SettingsMap = {};
    (rows ?? []).forEach((r: any) => { map[r.key] = r.value; });
    setSettings(map);

    const { data: roles } = await supabase.from("user_roles").select("id,user_id,role").order("created_at", { ascending: false });
    setRoleRows((roles ?? []) as any);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  async function saveKey(key: string, value: any) {
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key, value }, { onConflict: "key" });
    setSaving(false);
    if (error) toast.error(`Failed to save ${key}`);
    else {
      toast.success("Saved");
      setSettings((s) => ({ ...s, [key]: value }));
    }
  }

  // ------- Service zip codes -------
  const serviceZips: string[] = settings.service_zips?.list ?? [];
  const [newZip, setNewZip] = useState("");

  // ------- WhatsApp admin numbers -------
  const masterNumbers: string[] = Array.isArray(settings.master_numbers?.numbers)
    ? settings.master_numbers.numbers
    : Array.isArray(settings.master_numbers)
    ? settings.master_numbers
    : [];
  const [newWa, setNewWa] = useState("");

  // ------- Job status labels -------
  const labels: Record<string, string> = { ...JOB_STATUS_LABELS, ...(settings.job_status_labels ?? {}) };

  // ------- Notifications -------
  const notifications = { ...DEFAULT_NOTIFICATIONS, ...(settings.notifications ?? {}) };

  // ------- Payments -------
  const payments = { ...DEFAULT_PAYMENTS, ...(settings.payments ?? {}) };

  // ------- Coverage areas -------
  const coverageAreas: string[] = settings.coverage_areas?.list ?? [];
  const [newArea, setNewArea] = useState("");

  async function assignRole() {
    const email = emailToAssign.trim().toLowerCase();
    if (!email) return toast.error("Enter an email");
    // find user id via auth admin not available client-side; use a server fn-free trick: look up in user_roles by email won't work.
    // Fallback: ask user to paste a user_id if email isn't resolvable.
    const looksLikeUuid = /^[0-9a-f-]{36}$/i.test(email);
    let userId = looksLikeUuid ? email : null;
    if (!userId) {
      toast.error("Enter the user's UUID (email lookup requires an edge function).");
      return;
    }
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: roleToAssign as any });
    if (error) return toast.error(error.message);
    toast.success("Role assigned");
    setEmailToAssign("");
    loadAll();
  }

  async function removeRole(id: string) {
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    loadAll();
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading settings…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin Control Panel</h1>
        <p className="text-sm text-muted-foreground">Configure operational rules, coverage, notifications, payments and roles.</p>
      </div>

      <Tabs defaultValue="zips" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="zips">Service Zip Codes</TabsTrigger>
          <TabsTrigger value="coverage">Coverage Areas</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp Numbers</TabsTrigger>
          <TabsTrigger value="labels">Job Status Labels</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="roles">User Roles</TabsTrigger>
        </TabsList>

        {/* Service Zip Codes */}
        <TabsContent value="zips">
          <Card>
            <CardHeader>
              <CardTitle>Service Zip / Postcodes</CardTitle>
              <CardDescription>Areas where Tyre Fly currently accepts jobs. Jobs outside these areas are flagged.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="e.g. SW1, W1, EC2" value={newZip} onChange={(e) => setNewZip(e.target.value)} />
                <Button
                  onClick={() => {
                    const v = newZip.trim().toUpperCase();
                    if (!v) return;
                    if (serviceZips.includes(v)) return toast.error("Already added");
                    saveKey("service_zips", { list: [...serviceZips, v] });
                    setNewZip("");
                  }}
                >
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {serviceZips.length === 0 && <div className="text-sm text-muted-foreground">No postcodes added yet.</div>}
                {serviceZips.map((z) => (
                  <Badge key={z} variant="secondary" className="gap-1">
                    {z}
                    <button onClick={() => saveKey("service_zips", { list: serviceZips.filter((x) => x !== z) })}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coverage Areas */}
        <TabsContent value="coverage">
          <Card>
            <CardHeader>
              <CardTitle>Technician Coverage Areas</CardTitle>
              <CardDescription>Named regions used when assigning technicians (e.g. North London, Manchester Central).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Region name" value={newArea} onChange={(e) => setNewArea(e.target.value)} />
                <Button
                  onClick={() => {
                    const v = newArea.trim();
                    if (!v) return;
                    if (coverageAreas.includes(v)) return toast.error("Already added");
                    saveKey("coverage_areas", { list: [...coverageAreas, v] });
                    setNewArea("");
                  }}
                >
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {coverageAreas.length === 0 && <div className="text-sm text-muted-foreground">No regions added.</div>}
                {coverageAreas.map((a) => (
                  <Badge key={a} variant="secondary" className="gap-1">
                    {a}
                    <button onClick={() => saveKey("coverage_areas", { list: coverageAreas.filter((x) => x !== a) })}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Per-technician coverage is set on the Technicians page. These are the named regions you choose from.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp Numbers */}
        <TabsContent value="whatsapp">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Admin Numbers</CardTitle>
              <CardDescription>Numbers that receive admin alerts and can issue commands via WhatsApp. Include country code (e.g. +447…).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="+447xxxxxxxxx" value={newWa} onChange={(e) => setNewWa(e.target.value)} />
                <Button
                  onClick={() => {
                    const v = newWa.trim();
                    if (!v.startsWith("+")) return toast.error("Must start with +country code");
                    if (masterNumbers.includes(v)) return toast.error("Already added");
                    saveKey("master_numbers", { numbers: [...masterNumbers, v] });
                    setNewWa("");
                  }}
                >
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {masterNumbers.length === 0 && <div className="text-sm text-muted-foreground">No admin numbers configured.</div>}
                {masterNumbers.map((n) => (
                  <Badge key={n} variant="secondary" className="gap-1">
                    {n}
                    <button onClick={() => saveKey("master_numbers", { numbers: masterNumbers.filter((x) => x !== n) })}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Job Status Labels */}
        <TabsContent value="labels">
          <Card>
            <CardHeader>
              <CardTitle>Job Status Labels</CardTitle>
              <CardDescription>Customer-facing labels for internal job statuses. Internal status keys are unchanged.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/3">Status key</TableHead>
                    <TableHead>Display label</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.keys(JOB_STATUS_LABELS).map((key) => (
                    <TableRow key={key}>
                      <TableCell className="font-mono text-xs">{key}</TableCell>
                      <TableCell>
                        <Input
                          defaultValue={labels[key]}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (!v || v === labels[key]) return;
                            const next = { ...(settings.job_status_labels ?? {}), [key]: v };
                            saveKey("job_status_labels", next);
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Rules</CardTitle>
              <CardDescription>Control which events trigger WhatsApp / dashboard alerts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                ["notify_admin_new_job", "Notify admins when a new job arrives"],
                ["notify_admin_payment_received", "Notify admins when payment is received"],
                ["notify_admin_tech_application", "Notify admins on new technician application"],
                ["notify_customer_quote", "Notify customer when a quote is sent"],
                ["notify_customer_tech_assigned", "Notify customer when a technician is assigned"],
                ["notify_tech_new_job", "Notify technicians when a job is broadcast"],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center justify-between rounded-md border border-white/10 p-3">
                  <Label htmlFor={key} className="text-sm">{label}</Label>
                  <Switch
                    id={key}
                    checked={!!(notifications as any)[key]}
                    onCheckedChange={(v) => saveKey("notifications", { ...notifications, [key]: v })}
                  />
                </div>
              ))}
              <div className="flex items-center justify-between rounded-md border border-white/10 p-3 gap-3">
                <Label className="text-sm">Alert when job is unassigned after (minutes)</Label>
                <Input
                  type="number"
                  className="w-28"
                  defaultValue={notifications.alert_unassigned_after_minutes}
                  onBlur={(e) =>
                    saveKey("notifications", {
                      ...notifications,
                      alert_unassigned_after_minutes: Number(e.target.value) || 30,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Payment Settings</CardTitle>
              <CardDescription>Currency, deposit and live-mode controls for checkout.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={payments.currency}
                    onValueChange={(v) => saveKey("payments", { ...payments, currency: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GBP">GBP £</SelectItem>
                      <SelectItem value="USD">USD $</SelectItem>
                      <SelectItem value="EUR">EUR €</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Deposit %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={payments.deposit_percent}
                    onBlur={(e) =>
                      saveKey("payments", { ...payments, deposit_percent: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Fee label (shown to customer)</Label>
                  <Input
                    defaultValue={payments.fee_label}
                    onBlur={(e) => saveKey("payments", { ...payments, fee_label: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border border-white/10 p-3 sm:col-span-2">
                  <div>
                    <div className="text-sm font-medium">Use live payment keys</div>
                    <div className="text-xs text-muted-foreground">Off = sandbox mode. Turn on only when ready to charge real cards.</div>
                  </div>
                  <Switch
                    checked={!!payments.enable_live}
                    onCheckedChange={(v) => saveKey("payments", { ...payments, enable_live: v })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Roles */}
        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle>User Roles & Permissions</CardTitle>
              <CardDescription>Assign roles that govern what each user can see and do.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {ROLE_OPTIONS.map((r) => (
                  <div key={r.value} className="rounded-md border border-white/10 p-3">
                    <div className="text-sm font-medium">{r.label}</div>
                    <div className="text-xs text-muted-foreground">{r.desc}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-md border border-white/10 p-4 space-y-3">
                <div className="text-sm font-medium">Assign role</div>
                <div className="grid gap-2 sm:grid-cols-[1fr_200px_auto]">
                  <Input
                    placeholder="User UUID"
                    value={emailToAssign}
                    onChange={(e) => setEmailToAssign(e.target.value)}
                  />
                  <Select value={roleToAssign} onValueChange={setRoleToAssign}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={assignRole}><Save className="h-4 w-4" /> Assign</Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste the user's UUID (from Backend → Users). Email-based lookup needs an edge function.
                </p>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium">Current role assignments</div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roleRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-muted-foreground text-sm">No roles assigned yet.</TableCell>
                      </TableRow>
                    )}
                    {roleRows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">{r.user_id}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {ROLE_OPTIONS.find((o) => o.value === r.role)?.label ?? r.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => removeRole(r.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {saving && <div className="fixed bottom-4 right-4 rounded-md bg-primary px-3 py-1 text-xs text-primary-foreground">Saving…</div>}
    </div>
  );
}
