import { CLAIM_STATUS_LABELS } from '../../types/domain';
import type { ClaimStatus } from '../../types/database';

const COLORS: Record<ClaimStatus, string> = {
  pending: 'text-warning-400 bg-warning-400/10',
  accepted: 'text-brand-400 bg-brand-700/15',
  rejected: 'text-danger-400 bg-danger-500/10',
  cancelled: 'text-ink-500 bg-base-800',
  completed: 'text-brand-400 bg-brand-700/15',
};

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${COLORS[status]}`}>
      {CLAIM_STATUS_LABELS[status]}
    </span>
  );
}
