import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { UtensilsCrossed, Clock } from 'lucide-react';
import { DonationStatusBadge } from './DonationStatusBadge';
import { FOOD_CATEGORY_LABELS } from '../../types/domain';
import { msUntil, formatDateTime } from '../../utils/formatDate';
import type { Donation } from '../../types/domain';

export function DonationCard({
  donation,
  linkTo,
  imageUrl,
}: {
  donation: Donation;
  linkTo: string;
  imageUrl?: string;
}) {
  const isUrgent = useMemo(() => {
    if (donation.status !== 'available') return false;
    return msUntil(donation.pickupWindowEnd, Date.now()) < 1000 * 60 * 60 * 3;
  }, [donation.status, donation.pickupWindowEnd]);

  return (
    <Link
      to={linkTo}
      className="group flex flex-col overflow-hidden rounded-2xl border border-base-700 bg-base-900 transition-all hover:-translate-y-0.5 hover:border-base-600 hover:shadow-lg hover:shadow-black/20"
    >
      <div className="relative h-36 w-full overflow-hidden bg-base-850">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={donation.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-700">
            <UtensilsCrossed size={28} strokeWidth={1.5} />
          </div>
        )}

        <div className="absolute left-2 top-2 flex items-center gap-1.5">
          {donation.isVegetarian !== null && (
            <span
              className={`flex h-5 w-5 items-center justify-center rounded border-2 bg-base-950/90 ${
                donation.isVegetarian ? 'border-brand-400' : 'border-danger-400'
              }`}
              title={donation.isVegetarian ? 'Vegetarian' : 'Non-vegetarian'}
            >
              <span className={`h-2 w-2 rounded-full ${donation.isVegetarian ? 'bg-brand-400' : 'bg-danger-400'}`} />
            </span>
          )}
        </div>

        {donation.status !== 'available' && (
          <div className="absolute right-2 top-2">
            <DonationStatusBadge status={donation.status} />
          </div>
        )}

        {donation.status === 'available' && isUrgent && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-warm-600/90 px-2 py-0.5 text-[11px] font-medium text-base-950">
            <Clock size={11} strokeWidth={2.5} />
            Ending soon
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium leading-tight text-ink-100">{donation.title}</p>
        </div>
        <p className="text-sm text-ink-500">
          {FOOD_CATEGORY_LABELS[donation.category]} · {donation.quantityValue} {donation.quantityUnit}
        </p>
        <p className="truncate text-sm text-ink-700">{donation.pickupAddress}</p>
        <p className={`mt-auto pt-1.5 text-xs ${isUrgent ? 'text-warning-400' : 'text-ink-700'}`}>
          Pickup by {formatDateTime(donation.pickupWindowEnd)}
        </p>
      </div>
    </Link>
  );
}
