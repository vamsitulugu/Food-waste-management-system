import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAsyncData } from '../hooks/useAsyncData';
import { useRealtimeTable } from '../hooks/useRealtimeTable';
import { fetchDonation, fetchDonationImages } from '../api/donations';
import { fetchClaimsForDonation, cancelClaim, confirmSelfPickup, confirmDelivery } from '../api/claims';
import { fetchTaskForDonation } from '../api/tasks';
import { getDonationImageUrl } from '../api/storage';
import { DonationStatusBadge } from '../components/donations/DonationStatusBadge';
import { ClaimButton } from '../components/claims/ClaimButton';
import { ClaimList } from '../components/claims/ClaimList';
import { ClaimStatusBadge } from '../components/claims/ClaimStatusBadge';
import { ReportDonationButton } from '../components/donations/ReportDonationButton';
import { SaveDonationButton } from '../components/donations/SaveDonationButton';
import { DonationStatusTimeline } from '../components/donations/DonationStatusTimeline';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorState } from '../components/common/States';
import {
  FOOD_CATEGORY_LABELS,
  STORAGE_REQUIREMENT_LABELS,
  PICKUP_TASK_STATUS_LABELS,
  FULFILLMENT_METHOD_LABELS,
} from '../types/domain';
import { getErrorMessage } from '../utils/errors';

export function DonationDetailPage() {
  const { donationId } = useParams<{ donationId: string }>();
  const { session, profile } = useAuth();
  const { showToast } = useToast();

  const { data: donation, loading, error, refetch } = useAsyncData(() => fetchDonation(donationId!), [donationId]);
  const { data: images, refetch: refetchImages } = useAsyncData(() => fetchDonationImages(donationId!), [donationId]);
  const { data: claims, refetch: refetchClaims } = useAsyncData(() => fetchClaimsForDonation(donationId!), [donationId]);
  const { data: task, refetch: refetchTask } = useAsyncData(() => fetchTaskForDonation(donationId!), [donationId]);

  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [cancellingClaim, setCancellingClaim] = useState(false);

  useRealtimeTable('donations', refetch, { filter: `id=eq.${donationId}` });
  useRealtimeTable('donation_claims', () => { refetchClaims(); refetch(); }, { filter: `donation_id=eq.${donationId}` });
  useRealtimeTable('pickup_tasks', () => { refetchTask(); refetch(); }, { filter: `donation_id=eq.${donationId}` });

  useEffect(() => {
    if (!images) return;
    let cancelled = false;
    Promise.all(images.map(async (img) => [img.id, await getDonationImageUrl(img.storagePath)] as const)).then(
      (pairs) => {
        if (cancelled) return;
        const urls: Record<string, string> = {};
        pairs.forEach(([id, url]) => {
          if (url) urls[id] = url;
        });
        setImageUrls(urls);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [images]);

  if (loading) return <LoadingSpinner label="Loading donation" />;
  if (error || !donation) return <ErrorState message={error ?? 'Donation not found.'} onRetry={refetch} />;

  const isDonor = donation.donorId === session?.user.id;
  const myClaim = claims?.find((c) => c.claimantId === session?.user.id);
  const acceptedClaim = claims?.find((c) => c.status === 'accepted');
  const pendingClaims = claims?.filter((c) => c.status === 'pending') ?? [];

  function refreshAll() {
    refetch();
    refetchClaims();
    refetchTask();
    refetchImages();
  }

  async function handleCancelMyClaim() {
    if (!myClaim) return;
    setCancellingClaim(true);
    try {
      await cancelClaim(myClaim.id);
      showToast('success', 'Claim withdrawn.');
      refreshAll();
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Could not withdraw claim.'));
    } finally {
      setCancellingClaim(false);
    }
  }

  async function handleConfirmSelfPickup() {
    if (!myClaim) return;
    setConfirming(true);
    try {
      await confirmSelfPickup(myClaim.id);
      showToast('success', 'Marked as picked up. Thank you!');
      refreshAll();
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Could not confirm pickup.'));
    } finally {
      setConfirming(false);
    }
  }

  async function handleConfirmDelivery() {
    const claimToConfirm = isDonor ? acceptedClaim : myClaim;
    if (!claimToConfirm) return;
    setConfirming(true);
    try {
      await confirmDelivery(claimToConfirm.id);
      showToast('success', 'Delivery confirmed. Thank you!');
      refreshAll();
    } catch (err) {
      showToast('error', getErrorMessage(err, 'Could not confirm delivery.'));
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-2xl text-ink-100">{donation.title}</h1>
        <DonationStatusBadge status={donation.status} />
      </div>

      {!isDonor && (
        <div className="mt-3">
          <SaveDonationButton donationId={donation.id} />
        </div>
      )}

      {donation.status !== 'draft' && (
        <div className="mt-5 rounded-lg border border-base-700 bg-base-900 px-4 py-5">
          <DonationStatusTimeline
            status={donation.status}
            fulfillmentMethod={acceptedClaim?.fulfillmentMethod ?? myClaim?.fulfillmentMethod}
          />
        </div>
      )}

      {images && images.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {images.map((img) =>
            imageUrls[img.id] ? (
              <img key={img.id} src={imageUrls[img.id]} alt={donation.title} className="h-32 w-full rounded-md object-cover" />
            ) : null
          )}
        </div>
      )}

      {donation.description && <p className="mt-4 text-sm text-ink-300">{donation.description}</p>}

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-ink-500">Category</dt>
        <dd className="text-ink-100">{FOOD_CATEGORY_LABELS[donation.category]}</dd>
        <dt className="text-ink-500">Quantity</dt>
        <dd className="text-ink-100">{donation.quantityValue} {donation.quantityUnit}</dd>
        {donation.storageRequirement && (
          <>
            <dt className="text-ink-500">Storage</dt>
            <dd className="text-ink-100">{STORAGE_REQUIREMENT_LABELS[donation.storageRequirement]}</dd>
          </>
        )}
        {donation.allergens && donation.allergens.length > 0 && (
          <>
            <dt className="text-ink-500">Allergens</dt>
            <dd className="text-ink-100">{donation.allergens.join(', ')}</dd>
          </>
        )}
        <dt className="text-ink-500">Best before</dt>
        <dd className="text-ink-100">{new Date(donation.expiresAt).toLocaleString()}</dd>
        <dt className="text-ink-500">Pickup window</dt>
        <dd className="text-ink-100">
          {new Date(donation.pickupWindowStart).toLocaleString()} – {new Date(donation.pickupWindowEnd).toLocaleString()}
        </dd>
        <dt className="text-ink-500">Pickup address</dt>
        <dd className="text-ink-100">{donation.pickupAddress}</dd>
      </dl>

      <p className="mt-4 rounded-md border border-base-700 bg-base-900 px-4 py-3 text-xs text-ink-500">
        Food safety information is provided by the donor and has not been independently verified.
        Recipients and volunteers should use their own judgment.
      </p>

      {!isDonor && donation.status === 'available' && !myClaim && (
        <div className="sticky bottom-16 z-10 -mx-4 mt-6 bg-gradient-to-t from-base-950 via-base-950 to-transparent px-4 pb-3 pt-6 md:static md:mx-0 md:bg-none md:px-0 md:pb-0 md:pt-0">
          <ClaimButton donationId={donation.id} onClaimed={refreshAll} />
        </div>
      )}

      {!isDonor && myClaim && (
        <div className="mt-6 rounded-lg border border-base-700 bg-base-900 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-100">Your request</p>
            <ClaimStatusBadge status={myClaim.status} />
          </div>
          <p className="mt-1 text-xs text-ink-500">{FULFILLMENT_METHOD_LABELS[myClaim.fulfillmentMethod]}</p>

          {myClaim.status === 'pending' && (
            <Button variant="ghost" className="mt-3" loading={cancellingClaim} onClick={handleCancelMyClaim}>
              Withdraw request
            </Button>
          )}

          {myClaim.status === 'accepted' && myClaim.fulfillmentMethod === 'self_pickup' && donation.status === 'claimed' && (
            <Button className="mt-3" loading={confirming} onClick={handleConfirmSelfPickup}>
              I've picked this up
            </Button>
          )}

          {myClaim.status === 'accepted' && myClaim.fulfillmentMethod === 'volunteer_assisted' && donation.status === 'delivered' && (
            <Button className="mt-3" loading={confirming} onClick={handleConfirmDelivery}>
              Confirm I received this
            </Button>
          )}
        </div>
      )}

      {isDonor && donation.status === 'available' && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-medium text-ink-100">Requests ({pendingClaims.length} pending)</h2>
          <ClaimList claims={claims ?? []} onChange={refreshAll} />
        </div>
      )}

      {!isDonor && profile?.role === 'admin' && claims && claims.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-medium text-ink-100">All requests (admin view)</h2>
          <ClaimList claims={claims} onChange={refreshAll} readOnly />
        </div>
      )}

      {isDonor && acceptedClaim && donation.status !== 'available' && (
        <div className="mt-6 rounded-lg border border-base-700 bg-base-900 p-5">
          <p className="text-sm text-ink-100">Accepted: {acceptedClaim.claimant?.fullName ?? 'Recipient'}</p>
          <p className="mt-1 text-xs text-ink-500">{FULFILLMENT_METHOD_LABELS[acceptedClaim.fulfillmentMethod]}</p>

          {acceptedClaim.fulfillmentMethod === 'volunteer_assisted' && donation.status === 'delivered' && (
            <Button className="mt-3" loading={confirming} onClick={handleConfirmDelivery}>
              Confirm delivery received
            </Button>
          )}
        </div>
      )}

      {task && (
        <div className="mt-6 rounded-lg border border-base-700 bg-base-900 p-5">
          <h2 className="text-sm font-medium text-ink-100">Delivery task</h2>
          <p className="mt-1 text-sm text-ink-300">{PICKUP_TASK_STATUS_LABELS[task.status]}</p>
        </div>
      )}

      {!isDonor && (
        <div className="mt-6">
          <ReportDonationButton donationId={donation.id} />
        </div>
      )}
    </div>
  );
}
