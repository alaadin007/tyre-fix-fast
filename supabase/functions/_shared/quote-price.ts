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

  if (amount > 0) {
    const scaledFromSubPound = amount * 100;
    if (scaledFromSubPound >= MIN_CUSTOMER_QUOTE_GBP) return roundToPence(scaledFromSubPound);
  }

  // 1) £-prefixed amounts (e.g. "£40", "£12.50")
  const poundMatches = Array.from(rawMessage.matchAll(/£\s*([0-9]+(?:\.[0-9]{1,2})?)/gi))
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value >= MIN_CUSTOMER_QUOTE_GBP);

  // 2) Suffix forms like "5 pounds", "5 quid", "5 gbp"
  const suffixMatches = Array.from(
    rawMessage.matchAll(/\b([0-9]+(?:\.[0-9]{1,2})?)\s*(pounds?|quid|gbp)\b/gi),
  )
    .map((match) => Number(match[1]))
    .filter((value) => Number.isFinite(value) && value >= MIN_CUSTOMER_QUOTE_GBP);

  const allMatches = [...poundMatches, ...suffixMatches];

  if (allMatches.length === 1) return roundToPence(allMatches[0]);
  if (allMatches.length > 1) {
    const looksLikeBreakdown = /\b(callout|labou?r|tyre|tire|plus)\b|\+/i.test(rawMessage);
    const recovered = looksLikeBreakdown
      ? allMatches.reduce((sum, value) => sum + value, 0)
      : Math.max(...allMatches);
    return roundToPence(recovered);
  }

  // 3) Bare numeric reply with no other digits (e.g. message is just "5" or "12.50")
  const bareNumber = rawMessage.trim().match(/^([0-9]+(?:\.[0-9]{1,2})?)$/);
  if (bareNumber) {
    const value = Number(bareNumber[1]);
    if (Number.isFinite(value) && value >= MIN_CUSTOMER_QUOTE_GBP) return roundToPence(value);
  }

  return null;
}