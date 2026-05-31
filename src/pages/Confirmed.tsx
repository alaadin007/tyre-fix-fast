import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type JobRow = {
  id: string;
  platform_fee_status: string | null;
};

export default function Confirmed() {
  const [params] = useSearchParams();
  const jobId = params.get("job");
  const [job, setJob] = useState<JobRow | null>(null);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    let attempts = 0;

    const tick = async () => {
      attempts += 1;
      const { data: j } = await supabase
        .from("jobs")
        .select("id, platform_fee_status")
        .eq("id", jobId)
        .maybeSingle();
      if (cancelled || !j) return;
      setJob(j as JobRow);

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
  const reference = job?.id?.slice(0, 8).toUpperCase() ?? jobId.slice(0, 8).toUpperCase();

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
              <h1 className="text-xl font-bold">Payment received</h1>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Your payment has been received against job reference #{reference}.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
