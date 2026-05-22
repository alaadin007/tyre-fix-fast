export function extractCoordsFromWebhook(params: Record<string, string>): { lat: number; lng: number } | null {
  const rawLat = params.Latitude ?? params.latitude ?? params.Lat;
  const rawLng = params.Longitude ?? params.longitude ?? params.Lng ?? params.Long;

  if (typeof rawLat !== "string" || typeof rawLng !== "string") return null;
  if (!rawLat.trim() || !rawLng.trim()) return null;

  const directLat = Number(rawLat);
  const directLng = Number(rawLng);
  if (Number.isFinite(directLat) && Number.isFinite(directLng) && Math.abs(directLat) <= 90 && Math.abs(directLng) <= 180) {
    return { lat: directLat, lng: directLng };
  }

  return null;
}