export function LoadingSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-ink-500" role="status" aria-live="polite">
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-base-700 border-t-brand-400"
        aria-hidden="true"
      />
      <span>{label}…</span>
    </div>
  );
}

export function FullPageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base-950">
      <LoadingSpinner label="Loading your account" />
    </div>
  );
}
