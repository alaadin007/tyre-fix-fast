import { Helmet } from "react-helmet-async";

interface SeoProps {
  title: string;
  description: string;
  canonical?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
  /** Emits prerender-status-code meta so prerenderers/CDNs can serve a real HTTP status (e.g. 404). */
  statusCode?: number;
  ogImage?: string;
}

const SITE = "https://www.tyrefly.com";

/** Canonical/og URLs always end in a trailing slash (ignoring query/hash). */
function withTrailingSlash(url: string): string {
  const [base, ...rest] = url.split(/(?=[?#])/);
  if (!base) return url;
  const slashed = base.endsWith("/") || /\.[a-z0-9]+$/i.test(base) ? base : `${base}/`;
  return slashed + rest.join("");
}

export function Seo({ title, description, canonical, jsonLd, noindex, ogImage, statusCode }: SeoProps) {
  const canonHref = canonical ? withTrailingSlash(canonical.startsWith("http") ? canonical : `${SITE}${canonical}`) : undefined;
  const img = ogImage ?? `${SITE}/og.jpg`;
  const ldArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {canonHref && <link rel="canonical" href={canonHref} />}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      {noindex && <meta name="googlebot" content="noindex, nofollow" />}
      {statusCode && statusCode !== 200 && <meta name="prerender-status-code" content={String(statusCode)} />}

      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      {canonHref && <meta property="og:url" content={canonHref} />}
      <meta property="og:image" content={img} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={img} />

      {ldArray.map((ld, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(ld)}</script>
      ))}
    </Helmet>
  );
}
