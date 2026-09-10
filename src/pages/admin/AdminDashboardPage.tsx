import { Link } from 'react-router-dom';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchPlatformStats } from '../../api/admin';
import { StatsCard } from '../../components/admin/StatsCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ErrorState } from '../../components/common/States';

export function AdminDashboardPage() {
  const { data: stats, loading, error, refetch } = useAsyncData(fetchPlatformStats);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-2xl text-ink-100">Admin dashboard</h1>

      {loading && <LoadingSpinner label="Loading stats" />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatsCard label="Total users" value={stats.totalUsers} />
          <StatsCard label="Total donations" value={stats.totalDonations} />
          <StatsCard label="Completed donations" value={stats.completedDonations} />
          <StatsCard label="Active donations" value={stats.activeDonations} />
          <StatsCard label="Organizations pending verification" value={stats.pendingOrgVerifications} />
          <StatsCard label="Open reports" value={stats.openReports} />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link to="/admin/organizations" className="text-sm text-brand-400 hover:text-brand-300">
          Verify organizations →
        </Link>
        <Link to="/admin/reports" className="text-sm text-brand-400 hover:text-brand-300">
          Review reports →
        </Link>
        <Link to="/admin/donations" className="text-sm text-brand-400 hover:text-brand-300">
          Manage donations →
        </Link>
        <Link to="/admin/users" className="text-sm text-brand-400 hover:text-brand-300">
          Manage users →
        </Link>
        <Link to="/admin/audit-log" className="text-sm text-brand-400 hover:text-brand-300">
          Audit log →
        </Link>
      </div>
    </div>
  );
}
