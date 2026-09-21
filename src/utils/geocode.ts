/** Small helpers around OpenStreetMap Nominatim so donors never have to type coordinates.
 * Both functions fail soft (return null) — the form then asks the user to tap "Use my location". */

interface NominatimResult {
  lat: string;
  lon: string;
  display_name?: string;
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { display_name?: string };
    return data.display_name ?? null;
  } catch {
    return null;
  }
}

export async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!res.ok) return null;
    const results = (await res.json()) as NominatimResult[];
    if (!results.length) return null;
    return { latitude: Number(results[0].lat), longitude: Number(results[0].lon) };
  } catch {
    return null;
  }
}
