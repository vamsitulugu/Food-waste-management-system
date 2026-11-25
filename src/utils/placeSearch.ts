/**
 * Place finder for the pickup address.
 *
 * Photon (OpenStreetMap data, built for search-as-you-type) is tried first because it matches partial and
 * misspelled names and landmarks well. Nominatim is the fallback, and also retries with a shorter query
 * ("MG Road Kashinagar Odisha" -> "Kashinagar Odisha") so a vague name still finds the right area.
 * Both are free and need no API key. Every function fails soft (returns []).
 */

export interface Place {
  id: string;
  /** Full single-line address, saved as the donation's pickup address. */
  label: string;
  /** Short name for the first line of a suggestion (shop, street, area...). */
  primary: string;
  /** Rest of the address for the second line. */
  secondary: string;
  latitude: number;
  longitude: number;
}

export interface SearchBias {
  latitude: number;
  longitude: number;
}

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    district?: string;
    locality?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

interface NominatimItem {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
}

function unique(parts: (string | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const v = p?.trim();
    if (!v || seen.has(v.toLowerCase())) continue;
    seen.add(v.toLowerCase());
    out.push(v);
  }
  return out;
}

async function searchPhoton(query: string, bias: SearchBias | undefined, signal: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({ q: query, limit: '6' });
  if (bias) {
    params.set('lat', String(bias.latitude));
    params.set('lon', String(bias.longitude));
  }
  const res = await fetch(`https://photon.komoot.io/api/?${params.toString()}`, { signal });
  if (!res.ok) throw new Error('photon failed');
  const data = (await res.json()) as { features?: PhotonFeature[] };
  const places: Place[] = [];
  for (const f of data.features ?? []) {
    const c = f.geometry?.coordinates;
    const p = f.properties;
    if (!c || !p || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) continue;
    const street = unique([p.housenumber && p.street ? `${p.housenumber} ${p.street}` : p.street]);
    const primary = p.name ?? street[0] ?? p.locality ?? p.district ?? p.city;
    if (!primary) continue;
    const rest = unique([...street, p.locality, p.district, p.city, p.county, p.state, p.postcode, p.country]).filter(
      (x) => x.toLowerCase() !== primary.toLowerCase()
    );
    places.push({
      id: `photon:${p.osm_type ?? ''}${p.osm_id ?? `${c[1]},${c[0]}`}`,
      label: [primary, ...rest].join(', '),
      primary,
      secondary: rest.join(', '),
      latitude: c[1],
      longitude: c[0],
    });
  }
  return places;
}

async function searchNominatim(query: string, bias: SearchBias | undefined, signal: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({ format: 'jsonv2', limit: '6', addressdetails: '0', q: query });
  if (bias) {
    // prefer (not require) results near the person: roughly a 1 degree box around them
    const d = 1;
    params.set('viewbox', `${bias.longitude - d},${bias.latitude + d},${bias.longitude + d},${bias.latitude - d}`);
  }
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('nominatim failed');
  const items = (await res.json()) as NominatimItem[];
  return items.map((i) => {
    const [first, ...rest] = i.display_name.split(', ');
    return {
      id: `nominatim:${i.place_id}`,
      label: i.display_name,
      primary: i.name || first,
      secondary: rest.join(', '),
      latitude: Number(i.lat),
      longitude: Number(i.lon),
    };
  });
}

/** "Shop 4, MG Road, Kashinagar, Odisha" -> "MG Road, Kashinagar, Odisha" -> "Kashinagar, Odisha" */
function looserQueries(query: string): string[] {
  const parts = query
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (let i = 1; i < parts.length && out.length < 2; i += 1) out.push(parts.slice(i).join(', '));
  if (parts.length === 1) {
    const words = parts[0].split(/\s+/);
    if (words.length > 2) out.push(words.slice(1).join(' '));
  }
  return out;
}

function dedupe(places: Place[]): Place[] {
  const seen = new Set<string>();
  return places.filter((p) => {
    const key = `${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function searchPlaces(query: string, bias?: SearchBias, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const sig = signal ?? new AbortController().signal;

  try {
    const found = await searchPhoton(q, bias, sig);
    if (found.length > 0) return dedupe(found);
  } catch (err) {
    if (sig.aborted) return [];
    // fall through to Nominatim
    void err;
  }

  try {
    const found = await searchNominatim(q, bias, sig);
    if (found.length > 0) return dedupe(found);
    for (const loose of looserQueries(q)) {
      if (sig.aborted) return [];
      const more = await searchNominatim(loose, bias, sig);
      if (more.length > 0) return dedupe(more);
    }
  } catch {
    // fail soft
  }
  return [];
}
