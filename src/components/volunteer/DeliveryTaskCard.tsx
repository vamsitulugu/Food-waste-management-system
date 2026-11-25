import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ExternalLink, Leaf, MapPin, Navigation, UtensilsCrossed } from 'lucide-react';
import { FOOD_CATEGORY_LABELS, PICKUP_TASK_STATUS_LABELS } from '../../types/domain';
import type { PickupTask } from '../../types/domain';
import { formatDateTime } from '../../utils/formatDate';
import { formatDistanceMeters } from '../../utils/formatDistance';
import { CATEGORY_EMOJI } from '../../utils/foodEmoji';

/** One delivery task: photo, what & how much, where, when, how far, and actions. */
export function DeliveryTaskCard({
  task,
  imageUrl,
  distanceM,
  showStatus = false,
  children,
}: {
  task: PickupTask;
  imageUrl?: string;
  distanceM?: number;
  showStatus?: boolean;
  /** Action area (accept button, progress stepper, ...). */
  children?: ReactNode;
}) {
  const d = task.donation;

  if (!d) {
    return (
      <div className="rounded-2xl border border-base-700 bg-base-900 p-5 shadow-card">
        <p className="text-sm font-semibold text-ink-100">Donation details unavailable</p>
        <p className="mt-1 text-xs text-ink-500">
          Status: {PICKUP_TASK_STATUS_LABELS[task.status]}. The donation may have been removed.
        </p>
        {children && <div className="mt-3">{children}</div>}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-base-900 shadow-card">
      <div className="flex gap-4 p-4">
        <Link
          to={`/donations/${d.id}`}
          className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-base-800 sm:h-28 sm:w-28"
          aria-label={`View ${d.title}`}
        >
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-700/15 to-brand-600/10 text-brand-500/60">
              <UtensilsCrossed size={26} strokeWidth={1.5} />
            </div>
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link to={`/donations/${d.id}`} className="font-display text-base leading-snug text-ink-100 hover:text-brand-400">
              {d.title}
            </Link>
            {showStatus && (
              <span className="shrink-0 rounded-full bg-brand-700/10 px-2.5 py-0.5 text-[11px] font-bold text-brand-400">
                {PICKUP_TASK_STATUS_LABELS[task.status]}
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="rounded-full bg-base-800 px-2 py-0.5 font-semibold text-ink-300">
              {CATEGORY_EMOJI[d.category]} {FOOD_CATEGORY_LABELS[d.category]}
            </span>
            <span className="rounded-full bg-base-800 px-2 py-0.5 font-semibold text-ink-300">
              {d.quantityValue} {d.quantityUnit}
            </span>
            {d.isVegetarian && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success-500 px-2 py-0.5 font-bold text-white">
                <Leaf size={11} /> Veg
              </span>
            )}
          </div>

          <p className="mt-2 flex items-start gap-1.5 text-sm text-ink-300">
            <MapPin size={14} className="mt-0.5 shrink-0 text-ink-700" />
            <span className="min-w-0">{d.pickupAddress}</span>
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-ink-500">
            <Clock size={13} className="shrink-0" />
            Pick up by {formatDateTime(d.pickupWindowEnd)}
            {distanceM !== undefined && (
              <span className="ml-auto rounded-full bg-brand-700/10 px-2 py-0.5 font-bold text-brand-400">
                {formatDistanceMeters(distanceM)} away
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-base-600 bg-base-950/50 px-4 py-3">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${d.latitude},${d.longitude}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-700/10 px-3 py-2 text-xs font-bold text-brand-400 hover:bg-brand-700/15"
        >
          <Navigation size={13} /> Directions <ExternalLink size={11} />
        </a>
        <Link
          to={`/donations/${d.id}`}
          className="inline-flex items-center gap-1 px-2 py-2 text-xs font-bold text-ink-300 hover:text-ink-100"
        >
          Details
        </Link>
        {children && <div className="ml-auto">{children}</div>}
      </div>
    </div>
  );
}
