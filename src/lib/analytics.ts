// Google Analytics 4 (gtag.js) — frontend-only tracking.
// The measurement ID is provided by the Google Analytics connector and exposed
// to the browser as VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY.

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

let initialized = false;

export function initGA(): void {
  const measurementId = import.meta.env['VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY'];
  if (!measurementId) {
    if (import.meta.env['DEV']) {
      console.warn("[analytics] VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY not set — skipping GA init.");
    }
    return;
  }
  if (initialized || window.gtag) return;
  initialized = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  }
  window.gtag = gtag;

  gtag("js", new Date());
  gtag("config", measurementId);
}

/** Fire a virtual page view on client-side route changes. */
export function trackPageView(path: string = window.location.pathname): void {
  const measurementId = import.meta.env['VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY'];
  if (!measurementId || !window.gtag) return;
  window.gtag("event", "page_view", { page_path: path });
}
