import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { DonationStatusBadge } from './DonationStatusBadge';
import { FOOD_CATEGORY_LABELS } from '../../types/domain';
import { msUntil, formatDateTime } from '../../utils/formatDate';
import type { Donation } from '../../types/domain';

export function DonationCard({ donation, linkTo }: { donation: Donation; linkTo: string }) {
  const isUrgent = useMemo(() => {
    if (donation.status !== 'available') return false;
    return msUntil(donation.pickupWindowEnd, Date.now()) < 1000 * 60 * 60 * 3;
  }, [donation.status, donation.pickupWindowEnd]);

  return (
    <Link
      to={linkTo}
      className="flex flex-col gap-2 rounded-lg border border-base-700 bg-base-900 p-5 transition-colors hover:border-base-600"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-ink-100">{donation.title}</p>
        <DonationStatusBadge status={donation.status} />
      </div>
      <p className="text-sm text-ink-500">
        {FOOD_CATEGORY_LABELS[donation.category]} · {donation.quantityValue} {donation.quantityUnit}
      </p>
      <p className="text-sm text-ink-500">{donation.pickupAddress}</p>
      <p className={`text-xs ${isUrgent ? 'text-warning-400' : 'text-ink-700'}`}>
        Pickup by {formatDateTime(donation.pickupWindowEnd)}
      </p>
    </Link>
  );
}
