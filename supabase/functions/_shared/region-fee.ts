// Detects which booking-fee currency to charge based on the customer's
// E.164 phone number. Returns null for unsupported regions.
export type FeeCurrency = "gbp" | "usd" | "eur";

export interface FeeConfig {
  currency: FeeCurrency;
  amount: number;          // major units (e.g. 20, 25, 25)
  symbol: string;          // "£", "$", "€"
  display: string;         // "£20", "$25", "€25"
  priceLookup: string;     // Stripe price lookup key
}

const CONFIG: Record<FeeCurrency, FeeConfig> = {
  gbp: { currency: "gbp", amount: 20, symbol: "£", display: "£20", priceLookup: "platform_fee_20_gbp" },
  usd: { currency: "usd", amount: 25, symbol: "$", display: "$25", priceLookup: "platform_fee_25_usd" },
  eur: { currency: "eur", amount: 25, symbol: "€", display: "€25", priceLookup: "platform_fee_25_eur" },
};

// EU + EEA + Switzerland country calling codes → EUR
const EUR_PREFIXES = [
  "30","31","32","33","34","36","39","350","351","352","353","354","356","357","358","359",
  "370","371","372","385","386","420","421","423","43","45","46","47","48","49","382",
];

// USD: US/Canada (NANP "+1") and US territories share +1
const USD_PREFIXES = ["1"];

// GBP: UK
const GBP_PREFIXES = ["44"];

function stripPlus(phone: string): string {
  return phone.replace(/^whatsapp:/i, "").replace(/[^\d+]/g, "").replace(/^\+/, "");
}

export function feeForPhone(phone: string | null | undefined): FeeConfig | null {
  if (!phone) return null;
  const digits = stripPlus(phone);
  if (!digits) return null;

  // Match longest prefix first
  const match = (list: string[]) => list.some((p) => digits.startsWith(p));
  if (match(GBP_PREFIXES)) return CONFIG.gbp;
  if (match(EUR_PREFIXES.sort((a, b) => b.length - a.length))) return CONFIG.eur;
  if (match(USD_PREFIXES)) return CONFIG.usd;
  return null;
}

export function feeForCurrency(c: FeeCurrency): FeeConfig {
  return CONFIG[c];
}
