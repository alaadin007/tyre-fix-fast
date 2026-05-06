export type Country = { name: string; iso: string; dial: string; flag: string };

// Common countries first, then alphabetical. Dial codes without the leading +.
export const COUNTRIES: Country[] = [
  { name: "United Kingdom", iso: "GB", dial: "44", flag: "🇬🇧" },
  { name: "Ireland", iso: "IE", dial: "353", flag: "🇮🇪" },
  { name: "United States", iso: "US", dial: "1", flag: "🇺🇸" },
  { name: "Canada", iso: "CA", dial: "1", flag: "🇨🇦" },
  { name: "Australia", iso: "AU", dial: "61", flag: "🇦🇺" },
  { name: "New Zealand", iso: "NZ", dial: "64", flag: "🇳🇿" },
  { name: "France", iso: "FR", dial: "33", flag: "🇫🇷" },
  { name: "Germany", iso: "DE", dial: "49", flag: "🇩🇪" },
  { name: "Spain", iso: "ES", dial: "34", flag: "🇪🇸" },
  { name: "Italy", iso: "IT", dial: "39", flag: "🇮🇹" },
  { name: "Portugal", iso: "PT", dial: "351", flag: "🇵🇹" },
  { name: "Netherlands", iso: "NL", dial: "31", flag: "🇳🇱" },
  { name: "Belgium", iso: "BE", dial: "32", flag: "🇧🇪" },
  { name: "Switzerland", iso: "CH", dial: "41", flag: "🇨🇭" },
  { name: "Austria", iso: "AT", dial: "43", flag: "🇦🇹" },
  { name: "Sweden", iso: "SE", dial: "46", flag: "🇸🇪" },
  { name: "Norway", iso: "NO", dial: "47", flag: "🇳🇴" },
  { name: "Denmark", iso: "DK", dial: "45", flag: "🇩🇰" },
  { name: "Finland", iso: "FI", dial: "358", flag: "🇫🇮" },
  { name: "Poland", iso: "PL", dial: "48", flag: "🇵🇱" },
  { name: "Czech Republic", iso: "CZ", dial: "420", flag: "🇨🇿" },
  { name: "Romania", iso: "RO", dial: "40", flag: "🇷🇴" },
  { name: "Greece", iso: "GR", dial: "30", flag: "🇬🇷" },
  { name: "Turkey", iso: "TR", dial: "90", flag: "🇹🇷" },
  { name: "UAE", iso: "AE", dial: "971", flag: "🇦🇪" },
  { name: "Saudi Arabia", iso: "SA", dial: "966", flag: "🇸🇦" },
  { name: "Israel", iso: "IL", dial: "972", flag: "🇮🇱" },
  { name: "South Africa", iso: "ZA", dial: "27", flag: "🇿🇦" },
  { name: "Nigeria", iso: "NG", dial: "234", flag: "🇳🇬" },
  { name: "Kenya", iso: "KE", dial: "254", flag: "🇰🇪" },
  { name: "Egypt", iso: "EG", dial: "20", flag: "🇪🇬" },
  { name: "India", iso: "IN", dial: "91", flag: "🇮🇳" },
  { name: "Pakistan", iso: "PK", dial: "92", flag: "🇵🇰" },
  { name: "Bangladesh", iso: "BD", dial: "880", flag: "🇧🇩" },
  { name: "Singapore", iso: "SG", dial: "65", flag: "🇸🇬" },
  { name: "Hong Kong", iso: "HK", dial: "852", flag: "🇭🇰" },
  { name: "Japan", iso: "JP", dial: "81", flag: "🇯🇵" },
  { name: "South Korea", iso: "KR", dial: "82", flag: "🇰🇷" },
  { name: "China", iso: "CN", dial: "86", flag: "🇨🇳" },
  { name: "Brazil", iso: "BR", dial: "55", flag: "🇧🇷" },
  { name: "Mexico", iso: "MX", dial: "52", flag: "🇲🇽" },
  { name: "Argentina", iso: "AR", dial: "54", flag: "🇦🇷" },
];

export function buildE164(dial: string, national: string): string {
  // Strip everything except digits, then drop a single leading 0 (trunk prefix)
  const digits = national.replace(/\D/g, "").replace(/^0+/, "");
  return `+${dial}${digits}`;
}
