import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DashTech } from "@/hooks/useDashboardData";

type Mode = "create" | "edit";

export function TechnicianEditDialog({
  open, onOpenChange, mode, tech,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: Mode;
  tech?: DashTech | null;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [postcodes, setPostcodes] = useState("");
  const [radius, setRadius] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && tech) {
      setName(tech.name ?? "");
      setPhone(tech.phone ?? "");
      setWhatsapp(tech.whatsapp ?? "");
      setEmail(tech.email ?? "");
      setVehicle(tech.vehicle ?? "");
      setPostcodes((tech.service_postcodes ?? []).join(", "));
      setRadius(tech.travel_radius_miles ?? "");
      setNotes(tech.notes ?? "");
      setActive(!!tech.active);
    } else {
      setName(""); setPhone(""); setWhatsapp(""); setEmail("");
      setVehicle(""); setPostcodes(""); setRadius(""); setNotes(""); setActive(true);
    }
  }, [open, mode, tech]);

  const save = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    setBusy(true);
    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      whatsapp: whatsapp.trim() || null,
      email: email.trim() || null,
      vehicle: vehicle.trim() || null,
      service_postcodes: postcodes
        .split(/[,;\s]+/).map((p) => p.trim().toUpperCase()).filter(Boolean),
      travel_radius_miles: radius === "" ? null : Number(radius),
      notes: notes.trim() || null,
      active,
    };
    let error;
    if (mode === "edit" && tech) {
      ({ error } = await supabase.from("technicians").update(payload).eq("id", tech.id));
    } else {
      ({ error } = await supabase.from("technicians").insert({
        ...payload,
        approval_status: "approved",
        approved_at: new Date().toISOString(),
      }));
    }
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(mode === "edit" ? "Technician updated" : "Technician added");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit technician" : "Add technician"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          {mode === "edit" && tech?.tech_code && (
            <div className="rounded border border-white/10 bg-white/[0.03] px-3 py-2 text-xs">
              <span className="text-muted-foreground">Technician ID</span>{" "}
              <span className="font-mono text-foreground">{tech.tech_code}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44…" />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+44…" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Service postcodes (comma-separated)</Label>
              <Input value={postcodes} onChange={(e) => setPostcodes(e.target.value)} placeholder="SW1, NW3, E1" />
            </div>
            <div>
              <Label>Vehicle</Label>
              <Input value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
            </div>
            <div>
              <Label>Travel radius (mi)</Label>
              <Input type="number" value={radius} onChange={(e) => setRadius(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
            <div className="col-span-2">
              <Label>Internal notes</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="col-span-2 flex items-center justify-between rounded-md border border-white/10 px-3 py-2">
              <Label htmlFor="active-sw">Active</Label>
              <Switch id="active-sw" checked={active} onCheckedChange={setActive} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
