import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useToast } from '../../context/ToastContext';
import { fetchReports, resolveReportAsAdmin, adminRejectDonation } from '../../api/admin';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState, ErrorState } from '../../components/common/States';
import { REPORT_STATUS_LABELS } from '../../types/domain';
import { getErrorMessage } from '../../utils/errors';

export function AdminReportsPage() {
  const { data: reports, loading, error, refetch } = useAsyncData(() => fetchReports('open'));
  const { showToast } = useToast();
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [rejectReasonFor, setRejectReasonFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  async function handleDismiss(reportId: string) {
    setActingOn(reportId);
    try {
      await resolveReportAsAdmin(reportId, 'dismissed');
      showToast('success', 'Report dismissed.');
      refetch();
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Could not update report.'));
    } finally {
      setActingOn(null);
    }
  }

  async function handleRemoveDonation(reportId: string, donationId: string) {
    if (!rejectReason.trim()) {
      showToast('error', 'A reason is required.');
      return;
    }
    setActingOn(reportId);
    try {
      await adminRejectDonation(donationId, rejectReason.trim());
      await resolveReportAsAdmin(reportId, 'resolved');
      showToast('success', 'Donation removed and report resolved.');
      setRejectReasonFor(null);
      setRejectReason('');
      refetch();
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Could not remove donation.'));
    } finally {
      setActingOn(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-ink-100 sm:text-3xl">Open reports</h1>

      {loading && <LoadingSpinner label="Loading reports" />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && reports && reports.length === 0 && <EmptyState title="No open reports" />}

      {reports && reports.length > 0 && (
        <div className="flex flex-col gap-3">
          {reports.map((r) => (
            <div key={r.id} className="rounded-2xl border border-base-700 bg-base-900 shadow-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-ink-100">{r.reason}</p>
                  {r.details && <p className="mt-1 text-sm text-ink-500">{r.details}</p>}
                  {r.reportedDonationId && (
                    <Link
                      to={`/donations/${r.reportedDonationId}`}
                      className="mt-2 inline-block text-xs text-brand-400 hover:text-brand-300"
                    >
                      View reported donation →
                    </Link>
                  )}
                </div>
                <span className="text-xs text-ink-500">{REPORT_STATUS_LABELS[r.status]}</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" loading={actingOn === r.id} onClick={() => handleDismiss(r.id)}>
                  Dismiss
                </Button>
                {r.reportedDonationId && (
                  <Button variant="danger" onClick={() => setRejectReasonFor(r.id)}>
                    Remove donation
                  </Button>
                )}
              </div>

              {rejectReasonFor === r.id && r.reportedDonationId && (
                <div className="mt-3 flex flex-col gap-2">
                  <Input
                    label="Reason shown to the donor"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="danger"
                      loading={actingOn === r.id}
                      onClick={() => handleRemoveDonation(r.id, r.reportedDonationId!)}
                    >
                      Confirm removal
                    </Button>
                    <Button variant="ghost" onClick={() => setRejectReasonFor(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
