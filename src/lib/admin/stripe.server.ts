// Stripe access for the app backend. Mirrors supabase/functions/_shared/stripe.ts:
// every call is routed through the Lovable connector gateway, never api.stripe.com
// directly. Implemented with plain fetch + form encoding so it stays Worker-safe.

const GATEWAY_STRIPE_BASE = "https://connector-gateway.lovable.dev/stripe";

export type StripeEnv = "sandbox" | "live";

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
}

function flatten(value: unknown, prefix: string, out: string[][]): void {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    value.forEach((item, i) => flatten(item, `${prefix}[${i}]`, out));
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      flatten(v, `${prefix}[${k}]`, out);
    }
    return;
  }
  out.push([prefix, String(value)]);
}

function encodeForm(params: Record<string, unknown>): string {
  const pairs: string[][] = [];
  for (const [k, v] of Object.entries(params)) flatten(v, k, pairs);
  return pairs
    .map(([k, v]) => `${encodeURIComponent(k!)}=${encodeURIComponent(v!)}`)
    .join("&");
}

async function stripeRequest<T>(
  env: StripeEnv,
  path: string,
  params: Record<string, unknown>,
): Promise<T> {
  const connectionApiKey = getEnv(
    env === "sandbox" ? "STRIPE_SANDBOX_API_KEY" : "STRIPE_LIVE_API_KEY",
  );
  const lovableApiKey = getEnv("LOVABLE_API_KEY");

  const res = await fetch(`${GATEWAY_STRIPE_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      // The gateway rejects requests that also carry an Authorization header.
      "X-Connection-Api-Key": connectionApiKey,
      "Lovable-API-Key": lovableApiKey,
    },
    body: encodeForm(params),
  });

  const payload = (await res.json().catch(() => ({}))) as
    | { error?: { message?: string } }
    | Record<string, unknown>;
  if (!res.ok) {
    const message =
      (payload as { error?: { message?: string } })?.error?.message ??
      `Stripe request failed (${res.status})`;
    throw new Error(message);
  }
  return payload as T;
}

export type CheckoutSession = { id: string; url: string | null };

export function createCheckoutSession(
  env: StripeEnv,
  params: Record<string, unknown>,
): Promise<CheckoutSession> {
  return stripeRequest<CheckoutSession>(env, "/v1/checkout/sessions", params);
}

export type StripeRefund = { id: string; amount: number | null };

export function createRefund(
  env: StripeEnv,
  params: Record<string, unknown>,
): Promise<StripeRefund> {
  return stripeRequest<StripeRefund>(env, "/v1/refunds", params);
}
