/**
 * Extracts a human-readable message from a caught value, without assuming
 * it's a native Error instance. Supabase's PostgrestError/AuthError objects
 * usually do extend Error, but relying solely on `instanceof Error` is
 * fragile — it can silently fail to match if there's ever a module/version
 * mismatch, leaving the person with a generic, unhelpful fallback message
 * instead of the real database/auth error. This checks, in order: a native
 * Error's `.message`, any object with a non-empty string `.message` property
 * (covers Postgrest/Auth error shapes even if `instanceof` doesn't match),
 * a plain string throw, and only then falls back to the caller-supplied
 * default.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  if (
    err &&
    typeof err === 'object' &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string' &&
    (err as { message: string }).message
  ) {
    return (err as { message: string }).message;
  }
  if (typeof err === 'string' && err) {
    return err;
  }
  return fallback;
}
