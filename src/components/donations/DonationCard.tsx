import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { UtensilsCrossed, Clock, MapPin, Leaf } from 'lucide-react';
import { DonationStatusBadge } from './DonationStatusBadge';
import { FOOD_CATEGORY_LABELS } from '../../types/domain';
import { msUntil, formatDateTime } from '../../utils/formatDate';
import type { Donation } from '../../types/domain';

/** Swiggy/Zomato-style listing card: big image with gradient overlay, bold title, meta rows. */
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
      className="group flex flex-col overflow-hidden rounded-2xl bg-base-900 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover"
    >
      <div className="relative h-44 w-full overflow-hidden bg-base-800">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={donation.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-700/15 to-brand-600/10 text-brand-500/60">
            <UtensilsCrossed size={36} strokeWidth={1.5} />
          </div>
        )}

        {/* bottom gradient with quantity, like Swiggy's offer strip */}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/70 via-black/30 to-transparent px-3 pb-2.5 pt-10">
          <p className="font-display text-lg leading-none text-white">
            {donation.quantityValue} {donation.quantityUnit}
          </p>
          {donation.status === 'available' && isUrgent && (
            <span className="flex items-center gap-1 rounded-full bg-danger-500 px-2 py-0.5 text-[11px] font-bold text-white">
              <Clock size={11} strokeWidth={2.5} />
              Ending soon
            </span>
          )}
        </div>

        {donation.isVegetarian !== null && (
          <span
            className={`absolute left-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-[4px] border-2 bg-white ${
              donation.isVegetarian ? 'border-success-500' : 'border-danger-500'
            }`}
            title={donation.isVegetarian ? 'Vegetarian' : 'Non-vegetarian'}
          >
            <span className={`h-2 w-2 rounded-full ${donation.isVegetarian ? 'bg-success-500' : 'bg-danger-500'}`} />
          </span>
        )}

        {donation.status !== 'available' && (
          <div className="absolute right-2.5 top-2.5">
            <DonationStatusBadge status={donation.status} />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-display text-[17px] leading-snug text-ink-100">{donation.title}</p>
          {donation.isVegetarian && (
            <span className="mt-0.5 flex shrink-0 items-center gap-1 rounded-md bg-success-500 px-1.5 py-0.5 text-[11px] font-bold text-white">
              <Leaf size={11} /> Veg
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-ink-500">{FOOD_CATEGORY_LABELS[donation.category]}</p>
        <p className="flex items-center gap-1 truncate text-sm text-ink-700">
          <MapPin size={13} className="shrink-0" />
          <span className="truncate">{donation.pickupAddress}</span>
        </p>
        <div className="mt-2 border-t border-dashed border-base-600 pt-2.5">
          <p className={`flex items-center gap-1.5 text-xs font-semibold ${isUrgent ? 'text-danger-400' : 'text-ink-500'}`}>
            <Clock size={13} />
            Pickup by {formatDateTime(donation.pickupWindowEnd)}
          </p>
        </div>
      </div>
    </Link>
  );
}
