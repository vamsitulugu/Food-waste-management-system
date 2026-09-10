import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-base-700 bg-base-900/50 px-6 py-10 text-center">
      <p className="text-ink-100">{title}</p>
      {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-danger-500/40 bg-danger-500/10 px-6 py-6 text-center">
      <p className="text-sm text-danger-400">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 text-sm text-brand-400 hover:text-brand-300">
          Try again
        </button>
      )}
    </div>
  );
}
