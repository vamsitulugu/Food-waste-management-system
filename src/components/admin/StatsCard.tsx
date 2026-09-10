export function StatsCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-base-700 bg-base-900 p-5">
      <p className="text-2xl font-display text-ink-100">{value}</p>
      <p className="mt-1 text-sm text-ink-500">{label}</p>
    </div>
  );
}
