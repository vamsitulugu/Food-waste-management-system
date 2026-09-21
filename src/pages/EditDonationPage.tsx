import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { DonationForm, donationToFormValues } from '../components/donations/DonationForm';
import { DonationImageUploader } from '../components/donations/DonationImageUploader';
import { DonationStatusBadge } from '../components/donations/DonationStatusBadge';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorState } from '../components/common/States';
import { Input } from '../components/common/Input';
import { fetchDonation, updateDonation, publishDonation, cancelDonation } from '../api/donations';
import type { DonationInput } from '../api/donations';
import { getErrorMessage } from '../utils/errors';

export function EditDonationPage() {
  const { donationId } = useParams<{ donationId: string }>();
  const { session } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const { data: donation, loading, error, refetch } = useAsyncData(() => fetchDonation(donationId!), [donationId]);

  const [savingContent, setSavingContent] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  if (loading) return <LoadingSpinner label="Loading donation" />;
  if (error || !donation) return <ErrorState message={error ?? 'Donation not found.'} onRetry={refetch} />;

  if (donation.donorId !== session?.user.id) {
    return <ErrorState message="You don't have access to edit this donation." />;
  }

  const isEditableContent = donation.status === 'draft' || donation.status === 'available';
  const isCancellable = !['completed', 'cancelled', 'expired', 'rejected'].includes(donation.status);

  async function handleContentSave(input: DonationInput) {
    setSavingContent(true);
    try {
      await updateDonation(donation!.id, input);
      showToast('success', 'Donation updated.');
      refetch();
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Could not update donation.'));
    } finally {
      setSavingContent(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      await publishDonation(donation!.id);
      showToast('success', 'Donation published. It is now visible to recipients.');
      refetch();
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Could not publish donation.'));
    } finally {
      setPublishing(false);
    }
  }

  async function handleCancel() {
    if (!cancelReason.trim()) {
      showToast('error', 'A cancellation reason is required.');
      return;
    }
    setCancelling(true);
    try {
      await cancelDonation(donation!.id, cancelReason.trim());
      showToast('success', 'Donation cancelled.');
      navigate('/my-donations', { replace: true });
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Could not cancel donation.'));
      setCancelling(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink-100 sm:text-3xl">Edit donation</h1>
        <DonationStatusBadge status={donation.status} />
      </div>

      <div className="mt-6 rounded-2xl border border-base-700 bg-base-900 shadow-card p-6">
        <h2 className="mb-4 text-sm font-medium text-ink-100">Photos</h2>
        <DonationImageUploader donationId={donation.id} />
      </div>

      {donation.status === 'draft' && (
        <div className="mt-6 rounded-2xl border border-brand-500/30 bg-brand-700/10 p-6">
          <p className="text-sm text-ink-100">This donation is still a draft and not visible to anyone yet.</p>
          <Button className="mt-3" loading={publishing} onClick={handlePublish}>
            Publish donation
          </Button>
        </div>
      )}

      <div className="mt-6">
        {isEditableContent ? (
          <DonationForm
            initialValues={donationToFormValues(donation)}
            submitLabel="Save changes"
            submitting={savingContent}
            onSubmit={handleContentSave}
          />
        ) : (
          <p className="text-sm text-ink-500">
            This donation can no longer be edited because it has moved past the available stage.
          </p>
        )}
      </div>

      {isCancellable && (
        <div className="mt-6 rounded-2xl border border-danger-500/30 bg-base-900 p-6">
          <h2 className="text-sm font-medium text-ink-100">Cancel this donation</h2>
          {!confirmingCancel ? (
            <Button variant="danger" className="mt-3" onClick={() => setConfirmingCancel(true)}>
              Cancel donation
            </Button>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              <Input
                label="Reason for cancellation"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                required
              />
              <div className="flex gap-3">
                <Button variant="danger" loading={cancelling} onClick={handleCancel}>
                  Confirm cancellation
                </Button>
                <Button variant="ghost" onClick={() => setConfirmingCancel(false)}>
                  Never mind
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <Link to="/my-donations" className="mt-6 inline-block text-sm text-brand-400 hover:text-brand-300">
        Back to my donations
      </Link>
    </div>
  );
}
