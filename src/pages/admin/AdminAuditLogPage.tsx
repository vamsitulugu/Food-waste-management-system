import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchAuditLogs } from '../../api/admin';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState, ErrorState } from '../../components/common/States';

export function AdminAuditLogPage() {
  const { data: logs, loading, error, refetch } = useAsyncData(() => fetchAuditLogs(150));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink-100 sm:text-3xl">Audit log</h1>
        <p className="mt-1 text-sm text-ink-500">
          Append-only record of sensitive actions — organization verification, donation
          removals, report resolutions, account deactivation, and admin promotions.
        </p>
      </div>

      {loading && <LoadingSpinner label="Loading audit log" />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && logs && logs.length === 0 && <EmptyState title="No recorded actions yet" />}

      {logs && logs.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-base-700">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-base-700 bg-base-900 text-ink-500">
              <tr>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-base-800 last:border-b-0">
                  <td className="px-4 py-3 text-ink-100">{log.action}</td>
                  <td className="px-4 py-3 text-ink-500">{log.actorName ?? 'System'}</td>
                  <td className="px-4 py-3 text-ink-500">
                    {log.entityType} · {log.entityId.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3 text-ink-700">{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
