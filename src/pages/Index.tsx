import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import {
  MessageSquare,
  MessageCircle,
  Phone,
  Clock,
  ShieldCheck,
  MapPin,
  Star,
  Wrench,
  Zap,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PhotoUploader, type PhotoFile } from "@/components/PhotoUploader";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-technician.jpg";

const SMS_NUMBER = "+447447184489";
const SMS_DISPLAY = "07447 184489";

const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
const UK_PHONE = /^(?:\+44|0)\s?7\d{3}\s?\d{6}$/;

const schema = z.object({
  customer_name: z.string().trim().min(2, "Enter your name").max(100),
  customer_phone: z.string().trim().regex(UK_PHONE, "Enter a valid UK mobile"),
  customer_email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .max(255)
    .optional()
    .or(z.literal("")),
  postcode: z.string().trim().regex(UK_POSTCODE, "Enter a valid UK postcode"),
  issue_type: z.enum(["flat-tyre", "puncture", "tyre-change", "blowout", "other"]),
  issue_description: z.string().trim().max(1000).optional().or(z.literal("")),
});

const CITIES = [
  "London", "Manchester", "Birmingham", "Leeds", "Liverpool",
  "Glasgow", "Edinburgh", "Bristol", "Sheffield", "Newcastle",
  "Nottingham", "Cardiff", "Belfast", "Southampton", "Brighton",
  "Reading", "Coventry", "Leicester", "Oxford", "Cambridge",
];

const SERVICES = [
  { icon: Zap, title: "Punctures & Repairs", desc: "Plugged, patched and back on the road — usually under 30 minutes." },
  { icon: Wrench, title: "Tyre Replacement", desc: "Full tyre swaps at the kerb, your driveway, or the office car park." },
  { icon: ShieldCheck, title: "Blowouts & Emergencies", desc: "Stuck on the hard shoulder? We dispatch the nearest pro 24/7." },
  { icon: MapPin, title: "Anywhere in the UK", desc: "1,200+ vetted mobile technicians covering every postcode." },
];

const STEPS = [
  { n: "01", title: "Text us your postcode & tyre pics", desc: "Our AI connects you to local pros and you get a quote within minutes." },
  { n: "02", title: "Pay a small deposit", desc: "Lock in your job and your technician with a secure deposit — the rest is paid when it's done." },
  { n: "03", title: "Pro arrives & sorts it", desc: "Your local mobile tyre professional rolls up, fixes the issue, and you're back on the road." },
];

const FAQS = [
  { q: "How fast can someone get to me?", a: "Most jobs in major UK cities are reached within 30–60 minutes. Rural callouts may take a little longer — you'll see the ETA before you accept." },
  { q: "Do you operate at night?", a: "Yes. FlatTyreNearMe.Com runs 24/7/365. Whether it's 3am on the M25 or a Sunday morning in the Lakes, a local pro is on call." },
  { q: "How much does it cost?", a: "Puncture repairs typically £40–£70. Replacements depend on tyre size and brand. You'll get a transparent quote before booking — no hidden fees." },
  { q: "Are your technicians vetted?", a: "Every pro is ID-checked, insured, and rated by customers. Anyone falling below 4.5 stars is removed from the network." },
  { q: "What areas do you cover?", a: "All of mainland UK plus Northern Ireland. From central London to remote Highland roads, we route the closest available technician." },
];

const Index = () => {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState("");

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
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    try {
      setStage("Creating your request…");
      const { data: job, error } = await supabase
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
      if (error || !job) throw error ?? new Error("Insert failed");

      let photoUrls: string[] = [];
      if (photos.length) {
        setStage("Uploading photos…");
        photoUrls = await Promise.all(
          photos.map(async ({ file }, idx) => {
            const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
            const path = `jobs/${job.id}/${idx}-${crypto.randomUUID()}.${ext}`;
            const { error: upErr } = await supabase.storage
              .from("job-photos")
              .upload(path, file, { contentType: file.type || "image/jpeg" });
            if (upErr) throw upErr;
            return supabase.storage.from("job-photos").getPublicUrl(path).data.publicUrl;
          })
        );
        await supabase.from("jobs").update({ photo_urls: photoUrls }).eq("id", job.id);
      }

      if (photoUrls.length) {
        supabase.functions.invoke("analyze-damage", {
          body: {
            job_id: job.id,
            photo_urls: photoUrls,
            issue_description: parsed.data.issue_description,
            issue_type: parsed.data.issue_type,
          },
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

  const smsBody =
    "Hi FTNM — I need help with a flat tyre.\n\n" +
    "📍 Location / postcode: \n" +
    "📷 Please send clear photos (use flash 🔦) showing:\n" +
    "   • the nail / screw / object if visible\n" +
    "   • the rupture, cut or sidewall damage\n" +
    "   • the whole tyre & wheel\n" +
    "So we can see if it's repairable or needs replacing and quote you accurately.\n\n" +
    "🛞 If the sidewall isn't legible, tyre type & size: \n\n" +
    "Please send a quote and ETA. Thanks!";
  const smsHref = `sms:${SMS_NUMBER}?body=${encodeURIComponent(smsBody)}`;
  const telHref = `tel:${SMS_NUMBER}`;
  // wa.me uses the number without + or spaces
  const waHref = `https://wa.me/${SMS_NUMBER.replace(/\D/g, "")}?text=${encodeURIComponent(smsBody)}`;

  return (
    <main className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border/60 bg-primary text-primary-foreground">
        <div className="container flex h-12 items-center justify-between text-xs md:text-sm">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-accent" />
            <span className="font-medium">Live now — 1,200+ pros on call across the UK</span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <a
              href={smsHref}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground shadow-accent transition-transform hover:scale-105 md:text-sm"
            >
              <MessageSquare className="h-3.5 w-3.5" /> Text us
            </a>
            <a
              href={waHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(142_71%_38%)] px-3 py-1 text-xs font-bold text-white transition-transform hover:scale-105 md:text-sm"
            >
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
            <a href={telHref} className="hidden items-center gap-1.5 hover:text-accent md:inline-flex">
              <Phone className="h-3.5 w-3.5" /> 0800 000 0000
            </a>
            <span className="hidden opacity-60 md:inline">|</span>
            <span className="hidden items-center gap-1.5 md:inline-flex">
              <Clock className="h-3.5 w-3.5" /> 24/7/365
            </span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero text-primary-foreground">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/85 to-transparent" aria-hidden />

        <div className="container relative grid gap-10 py-16 md:grid-cols-2 md:py-24 lg:py-32">
          <div className="flex flex-col justify-center">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              UK's #1 mobile tyre network — rated 4.9/5
            </div>
            <h1 className="text-balance text-4xl font-black leading-[1.05] md:text-6xl lg:text-7xl">
              Flat tyre?{" "}
              <span className="bg-accent-gradient bg-clip-text text-transparent">
                Text us.
              </span>
              <br />
              We'll be there.
            </h1>
            <p className="mt-5 max-w-xl text-base text-white/80 md:text-lg">
              One message. A local mobile tyre professional comes straight to you —
              <strong className="text-white"> 24 hours a day, 7 days a week, 365 days a year.</strong>{" "}
              No call centres. No waiting on hold. Just help, fast.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a href={smsHref} className="group">
                <Button
                  size="lg"
                  className="h-14 w-full bg-accent-gradient px-8 text-base font-bold text-accent-foreground shadow-accent transition-transform hover:scale-[1.02] sm:w-auto"
                >
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Text us — Get help now
                  <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </a>
              <a href={waHref} target="_blank" rel="noreferrer">
                <Button
                  size="lg"
                  className="h-14 w-full bg-[hsl(142_71%_38%)] px-6 text-base font-bold text-white hover:bg-[hsl(142_71%_34%)] sm:w-auto"
                >
                  <MessageCircle className="mr-2 h-5 w-5" /> WhatsApp us
                </Button>
              </a>
              <a href={telHref}>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 w-full border-white/30 bg-white/5 px-6 text-base font-semibold text-white backdrop-blur hover:bg-white/15 hover:text-white sm:w-auto"
                >
                  <Phone className="mr-2 h-5 w-5" /> Call 0800 000 0000
                </Button>
              </a>
            </div>

            <p className="mt-4 text-sm text-white/70">
              Or text <span className="font-mono font-bold text-accent">TYRE</span> to{" "}
              <span className="font-mono font-bold text-accent">{SMS_DISPLAY}</span> — we reply in under 60 seconds.
            </p>

            {/* Trust strip */}
            <ul className="mt-10 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              {[
                { icon: Clock, label: "24/7/365" },
                { icon: Star, label: "4.9★ rated" },
                { icon: ShieldCheck, label: "Fully insured" },
                { icon: MapPin, label: "Nationwide" },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2 text-white/85">
                  <Icon className="h-4 w-4 text-accent" /> {label}
                </li>
              ))}
            </ul>
          </div>

          {/* Phone-style SMS preview */}
          <div className="relative mx-auto hidden w-full max-w-sm md:block">
            <div className="rounded-[2rem] border border-white/15 bg-card p-4 text-foreground shadow-elegant">
              <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Messages</span>
                <span>now</span>
              </div>
              <div className="space-y-2">
                <div className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-sm bg-accent px-3 py-2 text-sm text-accent-foreground">
                  Flat tyre on A40, just past Hanger Lane. Postcode W5 1DJ
                </div>
                <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm">
                  Hi! Sam here from FlatTyreNearMe.Com — 12 mins away. £65 to plug & inflate. Reply YES to confirm.
                </div>
                <div className="ml-auto w-fit max-w-[40%] rounded-2xl rounded-br-sm bg-accent px-3 py-2 text-sm text-accent-foreground">
                  YES
                </div>
                <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm">
                  On my way 🛻 Track me here: flattyrenearme.com/t/8fJ
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 rotate-3 rounded-xl bg-accent-gradient px-4 py-2 text-sm font-bold text-accent-foreground shadow-accent">
              Avg reply: 47s
            </div>
          </div>
        </div>
      </section>

      {/* Logo / press strip */}
      <section className="border-y border-border bg-muted/40 py-6">
        <div className="container flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <span>As seen in</span>
          <span>The Sun</span>
          <span>Auto Express</span>
          <span>BBC Radio 5</span>
          <span>Top Gear</span>
          <span>Which?</span>
          <span>AA Magazine</span>
        </div>
      </section>

      {/* Services */}
      <section className="container py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-accent">What we do</p>
          <h2 className="mt-2 text-3xl font-black md:text-5xl">Mobile tyre help, on demand.</h2>
          <p className="mt-4 text-muted-foreground">
            From a slow puncture in your driveway to a blowout on the motorway — we've got the kit, the people, and the speed.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map(({ icon: Icon, title, desc }) => (
            <article
              key={title}
              className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-accent/50 hover:shadow-elegant"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-gradient text-accent-foreground shadow-accent">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-primary py-16 text-primary-foreground md:py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-accent">How it works</p>
            <h2 className="mt-2 text-3xl font-black md:text-5xl">Three steps. One tyre. Sorted.</h2>
          </div>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map(({ n, title, desc }) => (
              <li key={n} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                <div className="text-5xl font-black text-accent">{n}</div>
                <h3 className="mt-3 text-xl font-bold">{title}</h3>
                <p className="mt-2 text-sm text-white/75">{desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Big SMS click target */}
      <section id="request" className="container py-16 md:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-accent">Fastest way to get help</p>
            <h2 className="mt-2 text-3xl font-black md:text-5xl">
              One tap. One text. <span className="text-accent">Sorted.</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Tap the button — your phone opens a new SMS, already filled in. Just add your postcode and a couple of tyre photos (use flash if it's dark). Our AI takes it from there.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "No payment until the job is done",
                "Background-checked, insured technicians",
                "Live ETA tracking by SMS",
                "Free puncture re-check within 7 days",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>

          <a
            href={smsHref}
            className="group relative block overflow-hidden rounded-3xl bg-accent-gradient p-8 text-accent-foreground shadow-accent transition-transform hover:scale-[1.01] md:p-12"
            aria-label="Open your messages app to text FlatTyreNearMe.Com"
          >
            <div
              aria-hidden
              className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-2xl"
            />
            <div className="relative flex flex-col items-center text-center">
              <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-3xl bg-white/15 backdrop-blur transition-transform group-hover:scale-110">
                <MessageSquare className="h-16 w-16" strokeWidth={2.2} />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-90">
                Tap to text us
              </p>
              <p className="mt-2 text-3xl font-black leading-tight md:text-4xl">
                Send an SMS now
              </p>
              <p className="mt-3 max-w-sm text-sm opacity-95">
                We'll reply within 60 seconds with quotes from your nearest mobile tyre pro.
              </p>

              {/* Pre-filled message preview */}
              <div className="mt-6 w-full rounded-2xl bg-primary/95 p-4 text-left text-sm text-primary-foreground shadow-elegant">
                <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-accent">
                  <span>Pre-filled message</span>
                  <span>To: {SMS_DISPLAY}</span>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-white/90">
{`Hi FTNM — I need help with a flat tyre.

📍 Location / postcode: 
📷 Photos with flash 🔦 showing:
   • the nail / screw / object
   • the rupture or sidewall cut
   • the whole tyre & wheel
   so we can see if it's repairable
   or needs replacing & quote accurately
🛞 If sidewall isn't legible,
   tyre type & size: `}
                </pre>
              </div>

              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-2 text-sm font-bold backdrop-blur">
                <MessageSquare className="h-4 w-4" />
                Open Messages
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </a>
        </div>

        {/* Fallback web form toggle */}
        <details className="mx-auto mt-12 max-w-3xl rounded-2xl border border-border bg-card p-6">
          <summary className="cursor-pointer text-sm font-semibold text-muted-foreground hover:text-foreground">
            Can't text right now? Use the web form instead →
          </summary>
          <form
            onSubmit={onSubmit}
            className="mt-6 space-y-5"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer_name">Your name</Label>
                <Input id="customer_name" name="customer_name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_phone">Mobile number</Label>
                <Input id="customer_phone" name="customer_phone" placeholder="07…" required />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode</Label>
                <Input id="postcode" name="postcode" placeholder="e.g. SW1A 1AA" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer_email">Email (optional)</Label>
                <Input id="customer_email" name="customer_email" type="email" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="issue_type">What's the issue?</Label>
              <Select name="issue_type" defaultValue="flat-tyre">
                <SelectTrigger id="issue_type"><SelectValue /></SelectTrigger>
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
              <PhotoUploader photos={photos} onChange={setPhotos} disabled={submitting} />
            </div>
            <Button
              type="submit"
              className="h-12 w-full bg-accent-gradient text-base font-bold text-accent-foreground shadow-accent hover:opacity-95"
              disabled={submitting}
            >
              {submitting ? stage || "Submitting…" : "Get quotes now"}
            </Button>
          </form>
        </details>
      </section>

      {/* Coverage / cities — SEO */}
      <section className="bg-muted/40 py-16 md:py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-accent">Coverage</p>
            <h2 className="mt-2 text-3xl font-black md:text-5xl">Mobile tyre repair near you</h2>
            <p className="mt-4 text-muted-foreground">
              Tap your city for local pricing, response times and 5-star reviews from drivers in your area.
            </p>
          </div>
          <ul className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {CITIES.map((city) => (
              <li key={city}>
                <a
                  href={`/mobile-tyre-repair/${city.toLowerCase().replace(/\s+/g, "-")}`}
                  className="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:border-accent hover:text-accent hover:shadow-sm"
                >
                  {city}
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-accent" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ — SEO */}
      <section className="container py-16 md:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-accent">FAQs</p>
            <h2 className="mt-2 text-3xl font-black md:text-5xl">Questions, answered.</h2>
          </div>
          <Accordion type="single" collapsible className="mt-10">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-base font-semibold">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden bg-hero py-16 text-primary-foreground md:py-24">
        <div className="container text-center">
          <h2 className="mx-auto max-w-3xl text-balance text-3xl font-black md:text-5xl">
            Don't let a flat tyre ruin your day.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/80">
            Text us right now — your local FlatTyreNearMe.Com pro is standing by.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href={smsHref}>
              <Button size="lg" className="h-14 bg-accent-gradient px-8 text-base font-bold text-accent-foreground shadow-accent">
                <MessageSquare className="mr-2 h-5 w-5" /> Text us now
              </Button>
            </a>
            <a href={telHref}>
              <Button size="lg" variant="outline" className="h-14 border-white/30 bg-white/5 px-6 text-base font-semibold text-white hover:bg-white/15 hover:text-white">
                <Phone className="mr-2 h-5 w-5" /> Call 0800 000 0000
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-primary text-primary-foreground">
        <div className="container grid gap-8 py-12 md:grid-cols-4">
          <div>
            <div className="text-2xl font-black">
              FlatTyreNearMe<span className="text-accent">.Com</span>
              <span className="ml-2 align-middle text-xs font-bold text-white/50">FTNM</span>
            </div>
            <p className="mt-3 text-sm text-white/70">
              The UK's fastest mobile tyre network. 24/7/365.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-accent">Services</h4>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>Puncture repair</li>
              <li>Tyre replacement</li>
              <li>Emergency callouts</li>
              <li>Fleet & business</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-accent">Company</h4>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>About</li>
              <li>For technicians</li>
              <li>Press</li>
              <li>Contact</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-accent">Get help now</h4>
            <a
              href={smsHref}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent-gradient px-4 py-3 text-sm font-bold text-accent-foreground shadow-accent transition-transform hover:scale-[1.02]"
            >
              <MessageSquare className="h-5 w-5" /> Text us now
            </a>
            <a
              href={telHref}
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-white/85 hover:text-accent"
            >
              <Phone className="h-4 w-4" /> 0800 000 0000
            </a>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-white/60">
          © {new Date().getFullYear()} FlatTyreNearMe.Com Ltd. All rights reserved.
        </div>
      </footer>
    </main>
  );
};

export default Index;
