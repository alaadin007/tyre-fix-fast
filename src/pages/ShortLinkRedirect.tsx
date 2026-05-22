import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function ShortLinkRedirect() {
  const { code } = useParams<{ code: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!code) return;
      const { data, error } = await supabase
        .from("short_links")
        .select("target_url, expires_at")
        .eq("code", code)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data?.target_url) {
        setError("Link not found or expired.");
        return;
      }
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError("This link has expired.");
        return;
      }
      window.location.replace(data.target_url);
    })();
    return () => { cancelled = true; };
  }, [code]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-2">
        {error ? (
          <>
            <h1 className="text-xl font-semibold">Link unavailable</h1>
            <p className="text-muted-foreground">{error}</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Opening secure payment…</h1>
            <p className="text-muted-foreground">Please wait a moment.</p>
          </>
        )}
      </div>
    </div>
  );
}
