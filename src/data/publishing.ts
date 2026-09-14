/**
 * Staged publishing + canonical strategy for the service x city page matrix.
 *
 * Rules:
 *  - /areas/<city>/          → primary target for city-level queries ("mobile tyre fitter London")
 *  - /services/<type>/       → primary target for service-type queries ("run flat tyre fitting")
 *  - /services/<type>/<city>/→ long-tail combination pages, released in stages.
 *
 * Only the cities listed below have their combination pages indexed and listed in
 * the sitemap. Everything else renders normally (so the page still works if a user
 * lands on it) but is served `noindex, follow`, kept out of the sitemap, and is not
 * linked from other pages — links point at the primary page for that intent instead.
 *
 * To release more cities: add the slug here and re-run `bun run scripts/gen-sitemap.ts`
 * (or add the URLs to public/sitemap.xml) once the first three show up in Search Console.
 */
export const PUBLISHED_COMBO_CITIES: readonly string[] = [
  "london",
  "greater-manchester", // Manchester
  "west-midlands", // Birmingham
];

/** True when the /services/<type>/<city>/ pages for this city are indexed + published. */
export function isComboPublished(citySlug: string): boolean {
  return PUBLISHED_COMBO_CITIES.includes(citySlug);
}

/**
 * Link target for "service X in city Y".
 * Published city → the combination page. Held-back city → the service hub page,
 * which is the primary target for that service-type query.
 */
export function serviceCityHref(serviceSlug: string, citySlug: string): string {
  return isComboPublished(citySlug)
    ? `/services/${serviceSlug}/${citySlug}`
    : `/services/${serviceSlug}`;
}

/**
 * Link target for "city Y" listed on a service page.
 * Published city → the combination page. Held-back city → the area page,
 * which is the primary target for that city-level query.
 */
export function cityFromServiceHref(serviceSlug: string, citySlug: string): string {
  return isComboPublished(citySlug)
    ? `/services/${serviceSlug}/${citySlug}`
    : `/areas/${citySlug}`;
}
