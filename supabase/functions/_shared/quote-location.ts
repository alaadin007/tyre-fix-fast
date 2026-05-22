export type QuoteLocationRow = {
  lat: number | null;
  lng: number | null;
  created_at: string | null;
  expires_at: string | null;
};

export function resolveQuoteLocationForAllocation(args: {
  techPin: { lat: number; lng: number } | null;
  allocationCreatedAt: string | null;
  locationRows: QuoteLocationRow[];
  now?: number;
}): { hasPin: boolean; lat: number | null; lng: number | null } {
  if (args.techPin) {
    return { hasPin: true, lat: args.techPin.lat, lng: args.techPin.lng };
  }

  const allocMs = args.allocationCreatedAt ? new Date(args.allocationCreatedAt).getTime() : Number.NaN;
  const now = args.now ?? Date.now();

  for (const row of args.locationRows ?? []) {
    const createdMs = row.created_at ? new Date(row.created_at).getTime() : Number.NaN;
    const expiresMs = row.expires_at ? new Date(row.expires_at).getTime() : Number.NaN;
    const validCoords = row.lat != null && row.lng != null;
    const afterAllocation = Number.isNaN(allocMs) ? true : (!Number.isNaN(createdMs) && createdMs >= allocMs);
    const stillLive = !Number.isNaN(expiresMs) && expiresMs > now;

    if (validCoords && afterAllocation && stillLive) {
      return { hasPin: true, lat: row.lat, lng: row.lng };
    }
  }

  return { hasPin: false, lat: null, lng: null };
}