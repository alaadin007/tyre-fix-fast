import { useEffect, useState } from "react";
import { useParams } from "@/lib/router-compat";
import { resolveShortLink } from "@/lib/resolve-short-link.functions";

export default function ShortLinkRedirect() {
  const { code } = useParams<{ code: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!code) return;
      const result = await resolveShortLink({ data: { code } }).catch(
        () => ({ status: "not_found" as const }),
      );
      if (cancelled) return;
      if (result.status !== "ok") {
        setError("Link not found or expired.");
        return;
      }
      // Immediate redirect — no intermediate copy shown.
      window.location.replace(result.target_url);

    })();
    return () => { cancelled = true; };
  }, [code]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold">Link unavailable</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  // Render a blank page while the browser redirects — avoids any
  // misleading intermediate copy (e.g. "Secure Payment") for map / photo links.
  return <div className="min-h-screen bg-background" aria-hidden="true" />;
}
