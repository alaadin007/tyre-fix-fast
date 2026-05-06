import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { WhatsAppChatCta } from "@/components/WhatsAppChatCta";

type Job = {
  id: string;
  customer_name: string;
  postcode: string;
  issue_type: string;
  issue_description: string | null;
  photo_urls: string[];
  damage_type: string | null;
  damage_summary: string | null;
  damage_confidence: string | null;
  status: string;
};

const prettyType = (t: string) =>
  t.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const JobStatus = () => {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id, customer_name, postcode, issue_type, issue_description, photo_urls, damage_type, damage_summary, damage_confidence, status"
        )
        .eq("id", id)
        .maybeSingle();
      if (!cancelled) {
        if (!error && data) setJob(data as Job);
        setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel(`job-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jobs",
          filter: `id=eq.${id}`,
        },
        (payload) => setJob(payload.new as Job)
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!job) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-lg font-medium">We can&apos;t find that job.</p>
        <Link to="/" className="text-primary underline">
          Start a new request
        </Link>
      </main>
    );
  }

  const awaitingAi = job.photo_urls.length > 0 && !job.damage_summary;

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto max-w-2xl px-4 py-10 md:py-14">
        <header className="mb-6">
          <h1 className="text-2xl font-bold md:text-3xl">
            Thanks {job.customer_name.split(" ")[0]} — we&apos;re on it.
          </h1>
          <p className="mt-2 text-muted-foreground">
            Reaching out to mobile technicians near {job.postcode}…
          </p>
        </header>

        {/* AI assessment card */}
        {(job.damage_summary || awaitingAi) && (
          <div className="mb-6 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              AI damage assessment
            </div>
            {awaitingAi ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing your photos…
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {job.damage_type && (
                    <Badge variant="secondary">
                      {prettyType(job.damage_type)}
                    </Badge>
                  )}
                  {job.damage_confidence && (
                    <Badge variant="outline">
                      {job.damage_confidence} confidence
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-foreground">
                  {job.damage_summary}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Photos */}
        {job.photo_urls.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              Your photos
            </h2>
            <ul className="grid grid-cols-3 gap-3">
              {job.photo_urls.map((url) => (
                <li
                  key={url}
                  className="aspect-square overflow-hidden rounded-md border border-border bg-muted"
                >
                  <a href={url} target="_blank" rel="noreferrer">
                    <img
                      src={url}
                      alt="Tyre damage"
                      className="h-full w-full object-cover"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-medium text-muted-foreground">
            Request summary
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Issue</dt>
              <dd>{prettyType(job.issue_type)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Postcode</dt>
              <dd>{job.postcode}</dd>
            </div>
            {job.issue_description && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Description</dt>
                <dd className="text-right">{job.issue_description}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Reference</dt>
              <dd className="font-mono text-xs">{job.id.slice(0, 8)}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-6">
          <WhatsAppChatCta
            message={`Hi Tyre Fly — I have a question about my job ${job.id.slice(0, 8)}`}
            label="Need a hand while you wait?"
            subLabel="Chat with our support team on WhatsApp"
          />
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          We&apos;ll text you the moment a technician quotes.
        </p>
      </section>
    </main>
  );
};

export default JobStatus;
