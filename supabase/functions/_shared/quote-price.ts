export const MIN_CUSTOMER_QUOTE_GBP = 1;

function roundToPence(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function isCustomerQuoteAmountValid(value: unknown): value is number {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= MIN_CUSTOMER_QUOTE_GBP;
}

export function normalizeSuspiciousQuotePrice(
  rawPrice: number | null | undefined,
  rawMessage: string,
): number | null {
  if (rawPrice == null) return null;

  const amount = Number(rawPrice);
  if (!Number.isFinite(amount)) return null;
  if (amount >= MIN_CUSTOMER_QUOTE_GBP) return roundToPence(amount);

  const poundMatches = Array.from(rawMessage.matchAll(/£\s*([0-9]+(?:\.[0-9]{1,2})?)/gi))
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value >= MIN_CUSTOMER_QUOTE_GBP);

  if (poundMatches.length === 1) return roundToPence(poundMatches[0]);
  if (poundMatches.length > 1) {
    const looksLikeBreakdown = /\b(callout|labou?r|tyre|tire|plus)\b|\+/i.test(rawMessage);
    const recovered = looksLikeBreakdown
      ? poundMatches.reduce((sum, value) => sum + value, 0)
      : Math.max(...poundMatches);
    return roundToPence(recovered);
  }

  return null;
}