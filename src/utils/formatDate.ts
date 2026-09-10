export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

/** Milliseconds until the given ISO timestamp, relative to `now` (defaults
 * to the current time, but accepts an explicit value so callers can avoid
 * calling Date.now() directly inside render). */
export function msUntil(iso: string, now: number): number {
  return new Date(iso).getTime() - now;
}
