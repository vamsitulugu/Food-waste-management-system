import { DONATION_STATUS_LABELS } from '../../types/domain';
import type { DonationStatus } from '../../types/database';

const COLORS: Record<DonationStatus, string> = {
  draft: 'text-ink-500 bg-base-800',
  available: 'text-success-400 bg-success-500/10',
  claimed: 'text-warm-400 bg-warm-600/15',
  pickup_assigned: 'text-warm-400 bg-warm-600/15',
  picked_up: 'text-warm-400 bg-warm-600/15',
  delivered: 'text-warm-400 bg-warm-600/15',
  completed: 'text-success-400 bg-success-500/10',
  cancelled: 'text-ink-500 bg-base-800',
  expired: 'text-danger-400 bg-danger-500/10',
  rejected: 'text-danger-400 bg-danger-500/10',
};

export function DonationStatusBadge({ status }: { status: DonationStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${COLORS[status]}`}>
      {DONATION_STATUS_LABELS[status]}
    </span>
  );
}
