import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useToast } from '../../context/ToastContext';
import { fetchDonationsForAdmin, adminRejectDonation } from '../../api/admin';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { DonationStatusBadge } from '../../components/donations/DonationStatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState, ErrorState } from '../../components/common/States';
import { DONATION_STATUS_LABELS } from '../../types/domain';
import type { DonationStatus } from '../../types/database';
import { getErrorMessage } from '../../utils/errors';

const STATUSES = Object.keys(DONATION_STATUS_LABELS) as DonationStatus[];

export function AdminDonationsPage() {
  const [status, setStatus] = useState<DonationStatus | ''>('');
  const [search, setSearch] = useState('');
  const { data: donations, loading, error, refetch } = useAsyncData(
    () => fetchDonationsForAdmin({ status: status || undefined, search: search || undefined }),
    [status, search]
  );
  const { showToast } = useToast();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleReject(donationId: string) {
    if (!reason.trim()) {
      showToast('error', 'A reason is required.');
      return;
    }
    setSubmitting(true);
    try {
      await adminRejectDonation(donationId, reason.trim());
      showToast('success', 'Donation removed.');
      setRejectingId(null);
      setReason('');
      refetch();
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Could not remove donation.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-ink-100">All donations</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="admin-donation-search" className="text-xs text-ink-500">
            Search title
          </label>
          <input
            id="admin-donation-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border border-base-700 bg-base-900 px-3 py-2 text-sm text-ink-100"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="admin-donation-status" className="text-xs text-ink-500">
            Status
          </label>
          <select
            id="admin-donation-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as DonationStatus | '')}
            className="rounded-md border border-base-700 bg-base-900 px-3 py-2 text-sm text-ink-100"
          >
            <option value="">Any</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {DONATION_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <LoadingSpinner label="Loading donations" />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && donations && donations.length === 0 && <EmptyState title="No donations match" />}

      {donations && donations.length > 0 && (
        <div className="flex flex-col gap-2">
          {donations.map((d) => (
            <div key={d.id} className="rounded-md border border-base-700 bg-base-900 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Link to={`/donations/${d.id}`} className="text-sm text-ink-100 hover:text-brand-300">
                    {d.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {d.quantityValue} {d.quantityUnit} · {new Date(d.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <DonationStatusBadge status={d.status} />
              </div>

              {!['completed', 'cancelled', 'expired', 'rejected'].includes(d.status) && (
                <div className="mt-3">
                  {rejectingId !== d.id ? (
                    <Button variant="danger" onClick={() => setRejectingId(d.id)}>
                      Remove
                    </Button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Input label="Reason shown to the donor" value={reason} onChange={(e) => setReason(e.target.value)} />
                      <div className="flex gap-2">
                        <Button variant="danger" loading={submitting} onClick={() => handleReject(d.id)}>
                          Confirm removal
                        </Button>
                        <Button variant="ghost" onClick={() => setRejectingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
