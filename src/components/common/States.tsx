import type { ReactNode } from 'react';
import { PackageSearch, AlertTriangle } from 'lucide-react';

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-base-700 bg-base-900/50 px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-base-850 text-ink-700">
        {icon ?? <PackageSearch size={26} strokeWidth={1.5} />}
      </div>
      <p className="text-ink-100">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-danger-500/40 bg-danger-500/10 px-6 py-8 text-center">
      <AlertTriangle size={22} className="mb-2 text-danger-400" strokeWidth={1.5} />
      <p className="text-sm text-danger-400">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 text-sm text-brand-400 hover:text-brand-300">
          Try again
        </button>
      )}
    </div>
  );
}
