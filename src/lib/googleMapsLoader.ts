// Lazy loader for the Google Maps JS API using the Lovable-managed browser key.
// Uses loading=async + a global callback so google.maps.Map is ready when we resolve.

declare global {
  interface Window {
    __gmapsInit?: () => void;
    google?: any;
  }
}

let promise: Promise<typeof window.google> | null = null;

export function loadGoogleMaps(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.maps) return Promise.resolve(window.google);
  if (promise) return promise;

  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;
  if (!key) {
    return Promise.reject(new Error("Google Maps browser key not configured"));
  }

  promise = new Promise((resolve, reject) => {
    window.__gmapsInit = () => resolve(window.google);
    const s = document.createElement("script");
    const params = new URLSearchParams({
      key,
      loading: "async",
      callback: "__gmapsInit",
      libraries: "marker",
    });
    if (channel) params.set("channel", channel);
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });

  return promise;
}
