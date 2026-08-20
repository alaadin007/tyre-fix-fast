import { useEffect } from "react";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useLocation,
  useRouter,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import NotFound from "@/pages/NotFound";
import { initGA, trackPageView } from "@/lib/analytics";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import appCss from "../styles.css?url";

const SITE_TITLE = "Tyrefly — Mobile Tyre Fitter & Puncture Repair UK";
const SITE_DESCRIPTION =
  "Text your postcode to Tyrefly and a local mobile tyre fitter arrives for puncture repair or replacement. 24/7, UK-wide.";
const OG_IMAGE = "https://www.tyrefly.com/og.jpg";
const OG_IMAGE_ALT = "Tyrefly — mobile tyre fitter and puncture repair, 24/7 UK.";

const GTM_SNIPPET =
  "(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0], j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src= 'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f); })(window,document,'script','dataLayer','GTM-PCGWH8W4');";

const ORG_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Tyrefly",
  url: "https://www.tyrefly.com/",
  logo: "https://www.tyrefly.com/favicon.png",
  description:
    "24/7 mobile tyre repair and replacement, anywhere in the UK. Text your postcode and a local pro is on the way.",
  areaServed: "United Kingdom",
  sameAs: [],
});

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { name: "theme-color", content: "#0D0D0D" },
      { title: SITE_TITLE },
      { name: "description", content: SITE_DESCRIPTION },
      {
        name: "keywords",
        content:
          "tyrefly, mobile tyre fitter, puncture repair, 24 hour tyre repair, emergency tyre, tyre replacement UK",
      },
      { name: "author", content: "Tyrefly" },
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:site_name", content: "Tyrefly" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.tyrefly.com/" },
      { property: "og:locale", content: "en_GB" },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:secure_url", content: OG_IMAGE },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: OG_IMAGE_ALT },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:description", content: SITE_DESCRIPTION },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
      { name: "twitter:image:alt", content: OG_IMAGE_ALT },
      { name: "twitter:title", content: SITE_TITLE },
      { name: "twitter:description", content: SITE_DESCRIPTION },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
    ],
    scripts: [
      { children: GTM_SNIPPET },
      { type: "application/ld+json", children: ORG_JSON_LD },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PCGWH8W4"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/**
 * The root head() carries fallback description/og/twitter tags for non-JS
 * crawlers. Page-level <Seo /> (react-helmet-async) adds its own tags after
 * hydration, so we remove the fallback tag whenever a Helmet-managed
 * counterpart (data-rh) exists — exactly one description/og/twitter tag per
 * page, matching the pre-migration behavior in main.tsx.
 */
function dedupeFallbackHeadTags() {
  const keys = [
    ['meta[name="description"]', 'name'],
    ['meta[name="keywords"]', 'name'],
    ['meta[name="robots"]', 'name'],
    ['meta[property^="og:"]', 'property'],
    ['meta[name^="twitter:"]', 'name'],
  ] as const;
  for (const [selector] of keys) {
    const tags = Array.from(document.head.querySelectorAll(selector));
    const hasHelmet = tags.some((el) => el.hasAttribute("data-rh"));
    if (!hasHelmet) continue;
    tags.forEach((el) => {
      if (!el.hasAttribute("data-rh")) el.remove();
    });
  }
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { pathname } = useLocation();

  // ported from main.tsx
  useEffect(() => {
    initGA();
  }, []);

  useEffect(() => {
    trackPageView(pathname);
    const t = window.setTimeout(dedupeFallbackHeadTags, 0);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Outlet />
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16 text-foreground">
      <div className="w-full max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Something went wrong</p>
        <h1 className="mb-3 mt-2 text-3xl font-bold">This page didn't load</h1>
        <p className="mb-8 text-muted-foreground">
          An unexpected error stopped this page from rendering. You can try again or head back home.
        </p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-md border border-border bg-background px-5 py-3 font-semibold hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
