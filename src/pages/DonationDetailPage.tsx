import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, ExternalLink, Leaf, MapPin, Package, Pencil, UtensilsCrossed } from 'lucide-react';
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
import { formatDateTime } from '../utils/formatDate';
import { CATEGORY_EMOJI } from '../utils/foodEmoji';

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
  const [activeImage, setActiveImage] = useState(0);

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

  const gallery = (images ?? []).map((img) => imageUrls[img.id]).filter((u): u is string => Boolean(u));
  const cover = gallery[Math.min(activeImage, Math.max(gallery.length - 1, 0))];
  const canEdit = isDonor && (donation.status === 'draft' || donation.status === 'available');

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/browse" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-100">
          <ArrowLeft size={16} /> Back
        </Link>
        {canEdit && (
          <Link
            to={`/donations/${donation.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-500/40 bg-base-900 px-3.5 py-2 text-sm font-bold text-brand-400 hover:bg-brand-700/10"
          >
            <Pencil size={14} /> Edit or cancel
          </Link>
        )}
      </div>

      {/* Photo hero */}
      <div className="overflow-hidden rounded-3xl bg-base-900 shadow-card">
        <div className="relative h-64 w-full bg-base-800 sm:h-96">
          {cover ? (
            <img src={cover} alt={donation.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-brand-700/15 to-brand-600/10 text-brand-500/60">
              <UtensilsCrossed size={44} strokeWidth={1.5} />
              <span className="text-sm font-medium">No photo added</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />
          {donation.isVegetarian !== null && (
            <span
              className={`absolute left-4 top-4 flex h-6 w-6 items-center justify-center rounded-md border-2 bg-white ${
                donation.isVegetarian ? 'border-success-500' : 'border-danger-500'
              }`}
              title={donation.isVegetarian ? 'Vegetarian' : 'Non-vegetarian'}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${donation.isVegetarian ? 'bg-success-500' : 'bg-danger-500'}`} />
            </span>
          )}
          <div className="absolute right-4 top-4">
            <DonationStatusBadge status={donation.status} />
          </div>
        </div>

        {gallery.length > 1 && (
          <div className="scrollbar-none flex gap-2 overflow-x-auto p-3">
            {gallery.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => setActiveImage(i)}
                aria-label={`Show photo ${i + 1}`}
                className={`h-16 w-20 shrink-0 overflow-hidden rounded-xl ring-2 transition-all ${
                  i === activeImage ? 'ring-brand-500' : 'ring-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Title */}
      <div className="mt-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl leading-tight text-ink-100 sm:text-3xl">{donation.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-base-900 px-3 py-1 font-semibold text-ink-300 shadow-card">
              {CATEGORY_EMOJI[donation.category]} {FOOD_CATEGORY_LABELS[donation.category]}
            </span>
            {donation.isVegetarian && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success-500 px-3 py-1 font-bold text-white">
                <Leaf size={13} /> Veg
              </span>
            )}
          </div>
        </div>
        {!isDonor && <SaveDonationButton donationId={donation.id} />}
      </div>

      {/* Key facts */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-base-900 p-4 shadow-card">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-700">
            <Package size={14} /> Quantity
          </p>
          <p className="font-display mt-1 text-xl text-ink-100">
            {donation.quantityValue} {donation.quantityUnit}
          </p>
        </div>
        <div className="rounded-2xl bg-base-900 p-4 shadow-card">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-700">
            <Clock size={14} /> Pick up by
          </p>
          <p className="font-display mt-1 text-xl text-ink-100">{formatDateTime(donation.pickupWindowEnd)}</p>
        </div>
        <div className="col-span-2 flex items-start justify-between gap-3 rounded-2xl bg-base-900 p-4 shadow-card">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-700">
              <MapPin size={14} /> Pickup address
            </p>
            <p className="mt-1 text-sm font-medium text-ink-100">{donation.pickupAddress}</p>
          </div>
          <a
            href={`https://www.google.com/maps?q=${donation.latitude},${donation.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-brand-700/10 px-3 py-2 text-xs font-bold text-brand-400 hover:bg-brand-700/15"
          >
            Map <ExternalLink size={12} />
          </a>
        </div>
        {donation.storageRequirement && (
          <div className="rounded-2xl bg-base-900 p-4 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-700">Storage</p>
            <p className="mt-1 text-sm font-medium text-ink-100">{STORAGE_REQUIREMENT_LABELS[donation.storageRequirement]}</p>
          </div>
        )}
        {donation.allergens && donation.allergens.length > 0 && (
          <div className="rounded-2xl bg-base-900 p-4 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-700">Allergens</p>
            <p className="mt-1 text-sm font-medium text-ink-100">{donation.allergens.join(', ')}</p>
          </div>
        )}
      </div>

      {donation.description && (
        <div className="mt-3 rounded-2xl bg-base-900 p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-700">Note from the donor</p>
          <p className="mt-1 text-sm text-ink-300">{donation.description}</p>
        </div>
      )}

      {donation.status !== 'draft' && donation.status !== 'available' && (
        <div className="mt-3 rounded-2xl bg-base-900 px-4 py-5 shadow-card">
          <DonationStatusTimeline
            status={donation.status}
            fulfillmentMethod={acceptedClaim?.fulfillmentMethod ?? myClaim?.fulfillmentMethod}
          />
        </div>
      )}

      <p className="mt-4 rounded-2xl bg-base-800 px-4 py-3 text-xs text-ink-500">
        Food safety information is provided by the donor and has not been independently verified. Please use your own
        judgment before eating.
      </p>

      {!isDonor && donation.status === 'available' && !myClaim && (
        <div className="sticky bottom-16 z-10 -mx-4 mt-6 bg-gradient-to-t from-base-950 via-base-950 to-transparent px-4 pb-3 pt-6 md:static md:mx-0 md:bg-none md:px-0 md:pb-0 md:pt-0">
          <ClaimButton donationId={donation.id} onClaimed={refreshAll} />
        </div>
      )}

      {!isDonor && myClaim && (
        <div className="mt-6 rounded-2xl border border-base-700 bg-base-900 shadow-card p-5">
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
        <div className="mt-6 rounded-2xl border border-base-700 bg-base-900 shadow-card p-5">
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
        <div className="mt-6 rounded-2xl border border-base-700 bg-base-900 shadow-card p-5">
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
