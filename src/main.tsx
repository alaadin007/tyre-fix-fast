import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root");

function renderApp() {
  if (!rootElement) return;

  createRoot(rootElement).render(
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  );
}

async function handleShortLinkRedirect() {
  const match = window.location.pathname.match(/^\/p\/([^/?#]+)/);
  if (!match) return false;

  const code = decodeURIComponent(match[1]);
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) return false;

  const requestUrl = new URL(`${supabaseUrl}/rest/v1/short_links`);
  requestUrl.searchParams.set("select", "target_url,expires_at");
  requestUrl.searchParams.set("code", `eq.${code}`);
  requestUrl.searchParams.set("limit", "1");

  try {
    const response = await fetch(requestUrl.toString(), {
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
      },
    });
    if (!response.ok) return false;

    const rows = (await response.json()) as Array<{
      target_url?: string | null;
      expires_at?: string | null;
    }>;
    const shortLink = rows?.[0];
    if (!shortLink?.target_url) return false;
    if (shortLink.expires_at && new Date(shortLink.expires_at) < new Date()) return false;

    if (rootElement) {
      rootElement.replaceChildren();
      rootElement.setAttribute("aria-hidden", "true");
    }

    window.location.replace(shortLink.target_url);
    return true;
  } catch {
    return false;
  }
}

void handleShortLinkRedirect().then((redirected) => {
  if (!redirected) renderApp();
});
