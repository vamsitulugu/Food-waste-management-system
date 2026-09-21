export function StatsCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-base-900 p-5 shadow-card">
      <p className="font-display text-3xl text-brand-500">{value}</p>
      <p className="mt-1 text-sm font-medium text-ink-500">{label}</p>
    </div>
  );
}
