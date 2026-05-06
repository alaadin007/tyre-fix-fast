import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Phone, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Tech = { id: string; name: string; phone: string; vehicle: string | null; rating: number | null };
type JobRow = {
  id: string;
  customer_name: string;
  platform_fee_status: string | null;
  assigned_technician_id: string | null;
  postcode: string;
};

export default function Confirmed() {
  const [params] = useSearchParams();
  const jobId = params.get("job");
  const [job, setJob] = useState<JobRow | null>(null);
  const [tech, setTech] = useState<Tech | null>(null);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    let attempts = 0;

    const tick = async () => {
      attempts += 1;
      const { data: j } = await supabase
        .from("jobs")
        .select("id, customer_name, platform_fee_status, assigned_technician_id, postcode")
        .eq("id", jobId)
        .maybeSingle();
      if (cancelled || !j) return;
      setJob(j as JobRow);

      if (j.assigned_technician_id) {
        const { data: t } = await supabase
          .from("technicians")
          .select("id, name, phone, vehicle, rating")
          .eq("id", j.assigned_technician_id)
          .maybeSingle();
        if (!cancelled && t) setTech(t as Tech);
      }

      if (j.platform_fee_status === "paid" || attempts > 30) {
        setPolling(false);
        return;
      }
      setTimeout(tick, 2000);
    };
    tick();
    return () => { cancelled = true; };
  }, [jobId]);

  if (!jobId) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Missing job reference.</p>
      </main>
    );
  }

  const paid = job?.platform_fee_status === "paid";

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/40 py-12 px-4">
      <div className="mx-auto max-w-md space-y-6">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to home
        </Link>

        {!paid ? (
          <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            <h1 className="mt-4 text-xl font-bold">Confirming your payment…</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {polling
                ? "Hang tight — this usually takes a few seconds."
                : "Still processing. Please refresh in a minute, or check your SMS."}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border bg-card p-8 shadow-sm">
            <div className="flex items-center gap-2 text-[hsl(var(--success))]">
              <CheckCircle2 className="h-6 w-6" />
              <h1 className="text-xl font-bold">You're matched!</h1>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Your £20 platform fee is paid. Here are your technician's details — they're already on their way to call you.
            </p>

            {tech ? (
              <div className="mt-6 rounded-xl border bg-muted/40 p-4 space-y-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Your technician</p>
                  <p className="text-lg font-semibold">{tech.name}</p>
                  {tech.vehicle && <p className="text-xs text-muted-foreground">{tech.vehicle}</p>}
                </div>
                <a
                  href={`tel:${tech.phone}`}
                  className="flex items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
                >
                  <Phone className="h-4 w-4" /> Call {tech.phone}
                </a>
                <a
                  href={`sms:${tech.phone}`}
                  className="flex items-center justify-center gap-2 rounded-lg border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted"
                >
                  Text technician
                </a>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">Loading technician details…</p>
            )}

            <div className="mt-6 rounded-lg border-l-4 border-[hsl(var(--accent))] bg-[hsl(var(--accent))]/5 p-3 text-xs">
              <p className="font-semibold">How payment for the job works</p>
              <p className="mt-1 text-muted-foreground">
                The technician will quote and accept payment directly — cash, bank transfer, or their card reader. The £20 you just paid is only our platform fee.
              </p>
            </div>

            <Button asChild variant="outline" className="mt-6 w-full">
              <Link to={`/job/${jobId}`}>View job details</Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
