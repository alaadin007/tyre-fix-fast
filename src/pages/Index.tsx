import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhotoUploader, type PhotoFile } from "@/components/PhotoUploader";
import { supabase } from "@/integrations/supabase/client";

const UK_POSTCODE =
  /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
const UK_PHONE = /^(?:\+44|0)\s?7\d{3}\s?\d{6}$/;

const schema = z.object({
  customer_name: z.string().trim().min(2, "Enter your name").max(100),
  customer_phone: z
    .string()
    .trim()
    .regex(UK_PHONE, "Enter a valid UK mobile number"),
  customer_email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .max(255)
    .optional()
    .or(z.literal("")),
  postcode: z
    .string()
    .trim()
    .regex(UK_POSTCODE, "Enter a valid UK postcode"),
  issue_type: z.enum([
    "flat-tyre",
    "puncture",
    "tyre-change",
    "blowout",
    "other",
  ]),
  issue_description: z.string().trim().max(1000).optional().or(z.literal("")),
});

const Index = () => {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<string>("");

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = {
      customer_name: String(fd.get("customer_name") ?? ""),
      customer_phone: String(fd.get("customer_phone") ?? ""),
      customer_email: String(fd.get("customer_email") ?? ""),
      postcode: String(fd.get("postcode") ?? ""),
      issue_type: String(fd.get("issue_type") ?? ""),
      issue_description: String(fd.get("issue_description") ?? ""),
    };
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast.error(first.message);
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create job row
      setStage("Creating your request…");
      const { data: job, error: insertError } = await supabase
        .from("jobs")
        .insert({
          customer_name: parsed.data.customer_name,
          customer_phone: parsed.data.customer_phone,
          customer_email: parsed.data.customer_email || null,
          postcode: parsed.data.postcode.toUpperCase(),
          issue_type: parsed.data.issue_type,
          issue_description: parsed.data.issue_description || null,
        })
        .select("id")
        .single();
      if (insertError || !job) throw insertError ?? new Error("Insert failed");

      // 2. Upload photos
      let photoUrls: string[] = [];
      if (photos.length) {
        setStage("Uploading photos…");
        const uploads = await Promise.all(
          photos.map(async ({ file }, idx) => {
            const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
            const path = `jobs/${job.id}/${idx}-${crypto.randomUUID()}.${ext}`;
            const { error: upErr } = await supabase.storage
              .from("job-photos")
              .upload(path, file, {
                contentType: file.type || "image/jpeg",
                upsert: false,
              });
            if (upErr) throw upErr;
            const { data: pub } = supabase.storage
              .from("job-photos")
              .getPublicUrl(path);
            return pub.publicUrl;
          })
        );
        photoUrls = uploads;
        const { error: updErr } = await supabase
          .from("jobs")
          .update({ photo_urls: photoUrls })
          .eq("id", job.id);
        if (updErr) throw updErr;
      }

      // 3. Trigger AI analysis (fire-and-forget; status page subscribes)
      if (photoUrls.length) {
        setStage("Analyzing damage…");
        supabase.functions
          .invoke("analyze-damage", {
            body: {
              job_id: job.id,
              photo_urls: photoUrls,
              issue_description: parsed.data.issue_description,
              issue_type: parsed.data.issue_type,
            },
          })
          .then(({ error }) => {
            if (error) console.error("analyze-damage error", error);
          });
      }

      navigate(`/job/${job.id}`);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
      setStage("");
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-2xl px-4 py-10 md:py-16">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
            Flat tyre? We&apos;ll send someone to you — fast.
          </h1>
          <p className="mt-3 text-muted-foreground">
            Tell us where you are and what&apos;s happened. We&apos;ll get
            quotes from mobile technicians near you in minutes.
          </p>
        </header>

        <form
          onSubmit={onSubmit}
          className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-sm md:p-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customer_name">Your name</Label>
              <Input id="customer_name" name="customer_name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_phone">Mobile number</Label>
              <Input
                id="customer_phone"
                name="customer_phone"
                placeholder="07…"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="postcode">Postcode</Label>
              <Input
                id="postcode"
                name="postcode"
                placeholder="e.g. SW1A 1AA"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_email">Email (optional)</Label>
              <Input id="customer_email" name="customer_email" type="email" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="issue_type">What&apos;s the issue?</Label>
            <Select name="issue_type" defaultValue="flat-tyre">
              <SelectTrigger id="issue_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flat-tyre">Flat tyre</SelectItem>
                <SelectItem value="puncture">Puncture</SelectItem>
                <SelectItem value="tyre-change">Tyre change</SelectItem>
                <SelectItem value="blowout">Blowout</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="issue_description">Describe what happened</Label>
            <Textarea
              id="issue_description"
              name="issue_description"
              placeholder="e.g. Hit a kerb, front left tyre is flat, car parked safely on side road…"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Photos of the damage</Label>
            <PhotoUploader
              photos={photos}
              onChange={setPhotos}
              disabled={submitting}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={submitting}
          >
            {submitting ? stage || "Submitting…" : "Get quotes now"}
          </Button>
        </form>
      </section>
    </main>
  );
};

export default Index;
