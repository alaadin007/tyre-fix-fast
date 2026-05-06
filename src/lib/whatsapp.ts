// Build a wa.me link from any UK-style phone input.
// wa.me requires the full international number with NO leading "+" or "00".
// - "+44 7447 184489" -> "447447184489"
// - "07447 184489"    -> "447447184489" (UK default)
// - "00447447184489"  -> "447447184489"
export function toWaNumber(raw: string, defaultCc = "44"): string {
  let digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = defaultCc + digits.slice(1);
  return digits;
}

export function waLink(raw: string, message?: string): string {
  const num = toWaNumber(raw);
  const base = `https://wa.me/${num}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const SUPPORT_WHATSAPP = "+447447184489";
export const SUPPORT_WA_DISPLAY = "+44 7447 184489";
